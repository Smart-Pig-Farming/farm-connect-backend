import { Request, Response } from "express";
import { Op, Transaction, QueryTypes } from "sequelize";
import sequelize from "../config/database";
import BestPracticeContent from "../models/BestPracticeContent";
import BestPracticeRead from "../models/BestPracticeRead";
import User from "../models/User";
import { StorageFactory } from "../services/storage/StorageFactory";
import scoringService from "../services/scoring/ScoringService";
import { Points } from "../services/scoring/ScoreTypes";
import { mapPointsToLevel } from "../services/scoring/LevelService";
import UserScoreTotal from "../models/UserScoreTotal";
import { getWebSocketService } from "../services/webSocketService";
// Lazy storage instance
let __bpStorage: any;
function bpStorage() {
  if (!__bpStorage) __bpStorage = StorageFactory.createStorageService();
  return __bpStorage;
}

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; permissions: string[] };
}

const ALLOWED_CATEGORIES = new Set([
  "feeding_nutrition",
  "disease_control",
  "growth_weight",
  "environment_management",
  "breeding_insemination",
  "farrowing_management",
  "record_management",
  "marketing_finance",
]);

// Human-friendly metadata for categories (UI alignment)
const CATEGORY_META: Record<string, { label: string }> = {
  feeding_nutrition: { label: "Feeding & Nutrition" },
  disease_control: { label: "Disease Control" },
  growth_weight: { label: "Growth & Weight Mgmt" },
  environment_management: { label: "Environment Mgmt" },
  breeding_insemination: { label: "Breeding & Insemination" },
  farrowing_management: { label: "Farrowing Mgmt" },
  record_management: { label: "Record & Farm Mgmt" },
  marketing_finance: { label: "Marketing & Finance" },
};

function sanitizeCategories(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((c) => ALLOWED_CATEGORIES.has(c));
}

// Accept categories supplied as:
// - array (already parsed)
// - JSON string representing an array
// - single string (wrap into array)
// - undefined -> empty array
function parseIncomingCategories(raw: any): string[] {
  if (Array.isArray(raw)) return sanitizeCategories(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return sanitizeCategories(parsed);
    } catch {
      // not JSON, treat as single value
      return sanitizeCategories([raw]);
    }
    // Fallback if JSON.parse returned non-array
    return [];
  }
  return [];
}

class BestPracticeController {
  // GET /api/best-practices/categories
  // Returns count of published, non-deleted practices per allowed category (0 included)
  async categories(req: AuthRequest, res: Response) {
    try {
      const rows = (await sequelize.query(
        `SELECT cat as category, COUNT(*)::int AS count
         FROM (
           SELECT UNNEST(categories) AS cat
           FROM best_practice_contents
           WHERE is_deleted = false AND is_published = true
         ) t
         GROUP BY cat`,
        { type: QueryTypes.SELECT }
      )) as Array<{ category: string; count: number }>;
      const map: Record<string, number> = {};
      for (const r of rows) map[r.category] = r.count;
      const categories = Array.from(ALLOWED_CATEGORIES).map((key) => ({
        key,
        label: CATEGORY_META[key]?.label || key,
        count: map[key] || 0,
      }));
      const total = categories.reduce((a, c) => a + c.count, 0);
      return res.json({ categories, total });
    } catch (e) {
      console.error("[bestPractices:categories]", e);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const {
        title,
        description,
        steps,
        benefits,
        categories, // may be array or JSON string
        media,
      } = req.body; // is_published ignored: auto-publish
      if (!title || !description) {
        return res
          .status(400)
          .json({ error: "title and description required" });
      }
      const stepsArr = Array.isArray(steps)
        ? steps
        : typeof steps === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(steps);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];
      const benefitsArr = Array.isArray(benefits)
        ? benefits
        : typeof benefits === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(benefits);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];
      // Support categories sent as categories or categories[] (repeat). If categories[] used, Express will give last value; treat as single string.
      const rawCategories = categories ?? (req.body as any)["categories[]"]; // capture legacy form-data naming
      const catArr = parseIncomingCategories(rawCategories);
      // If a file was uploaded via multer single field 'media'
      let mediaPayload = media || null;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (file) {
        // Only allow one file; determine type
        const mediaType = file.mimetype.startsWith("video/")
          ? "video"
          : "image";
        const uploaded = await bpStorage().upload(file.buffer, {
          postId: `bp-${req.user.id}`,
          mediaType: mediaType as any,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        });
        mediaPayload = {
          kind: mediaType,
          url: uploaded.url,
          thumbnail_url: uploaded.thumbnailUrl,
          originalName: file.originalname,
          storageKey: uploaded.storageKey,
        };
      }

      const createPayload: any = {
        title: String(title).trim(),
        description: String(description),
        steps_json: stepsArr || [],
        benefits_json: benefitsArr || [],
        categories: catArr || [],
        media: mediaPayload,
        // Auto-publish on creation
        is_published: true,
        language: "en",
        created_by: req.user.id,
      };

      const created = await BestPracticeContent.create(createPayload);
      return res.status(201).json({ practice: created });
    } catch (e) {
      console.error("[bestPractices:create]", e);
      return res.status(500).json({ error: "Failed to create" });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const {
        limit = 10,
        cursor,
        search = "",
        category,
        created_by,
        published,
      } = req.query;
      const limitNum = Math.min(50, Number(limit) || 10);
      const useCursor = Object.prototype.hasOwnProperty.call(
        req.query,
        "cursor"
      );
      const where: any = { is_deleted: false };
      if (published !== undefined) where.is_published = published === "true";
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (category && typeof category === "string") {
        where.categories = { [Op.contains]: [category] } as any; // PG array contains
      }
      if (created_by) where.created_by = created_by;
      if (cursor && typeof cursor === "string" && cursor.trim()) {
        where.created_at = { [Op.lt]: new Date(cursor) };
      }

      const rows = await BestPracticeContent.findAll({
        where,
        order: [
          ["created_at", "DESC"],
          ["id", "DESC"],
        ],
        limit: useCursor ? limitNum + 1 : limitNum,
        attributes: [
          "id",
          "title",
          "description",
          "categories",
          "is_published",
          "created_at",
          "read_count",
          // Include raw JSON fields for local parsing (may contain stringified arrays in legacy rows)
          "steps_json",
          "benefits_json",
        ],
      });

      let items = rows;
      let hasNextPage = false;
      let nextCursor: string | null = null;
      if (useCursor && rows.length > limitNum) {
        items = rows.slice(0, limitNum);
        hasNextPage = true;
        const last = items[items.length - 1];
        nextCursor = last.created_at
          ? new Date(last.created_at).toISOString()
          : null;
      }

      // Attach read status for current user
      let readMap: Record<number, any> = {};
      if (req.user && items.length) {
        const ids = items.map((i) => i.id);
        const reads = await BestPracticeRead.findAll({
          where: { best_practice_id: ids, user_id: req.user.id } as any,
        });
        for (const r of reads) readMap[r.best_practice_id] = r;
      }

      const data = items.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: p.description.slice(0, 160),
        categories: p.categories,
        is_published: p.is_published,
        created_at: p.created_at,
        read: !!readMap[p.id],
        last_read_at: readMap[p.id]?.last_read_at || null,
        read_count: p.read_count,
        steps_count: (() => {
          const raw = (p as any).get?.("steps_json") ?? (p as any).steps_json;
          if (Array.isArray(raw)) return raw.length;
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              return Array.isArray(parsed) ? parsed.length : 0;
            } catch {
              return 0;
            }
          }
          return 0;
        })(),
        benefits_count: (() => {
          const raw =
            (p as any).get?.("benefits_json") ?? (p as any).benefits_json;
          if (Array.isArray(raw)) return raw.length;
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              return Array.isArray(parsed) ? parsed.length : 0;
            } catch {
              return 0;
            }
          }
          return 0;
        })(),
      }));

      return res.json({
        items: data,
        pageInfo: { hasNextPage, nextCursor },
      });
    } catch (e) {
      console.error("[bestPractices:list]", e);
      return res.status(500).json({ error: "Failed to list" });
    }
  }

  async getOne(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    try {
      // Contract (documented):
      // - Response.practice.read is POST-STATE (true if the user now has a read row; may have been created during this request).
      // - Response.scoring.awarded_first_read is true ONLY on the request that created the first read row & awarded points.
      //   Frontend should gate +points flash exclusively on awarded_first_read.
      const practice = await BestPracticeContent.findOne({
        where: { id, is_deleted: false },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstname", "lastname"],
          },
        ],
      });
      if (!practice) return res.status(404).json({ error: "Not found" });

      // Sanitize legacy / incorrect stringified JSON in JSONB fields
      try {
        const rawSteps: any = (practice as any).get("steps_json");
        if (typeof rawSteps === "string") {
          try {
            const parsed = JSON.parse(rawSteps);
            if (Array.isArray(parsed))
              (practice as any).set("steps_json", parsed);
          } catch {
            /* ignore parse errors */
          }
        }
        const rawBenefits: any = (practice as any).get("benefits_json");
        if (typeof rawBenefits === "string") {
          try {
            const parsed = JSON.parse(rawBenefits);
            if (Array.isArray(parsed))
              (practice as any).set("benefits_json", parsed);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* noop */
      }

      // Record read receipt & first-read scoring (idempotent)
      let awarded_first_read = false;
      // We expose a user-specific read flag in the response that represents the *state before this request*.
      // If this request resulted in awarding a first read, we still return read=false so the frontend can flash +1.
      // On subsequent loads it will return true.
      let user_read_before = false;
      let user_points: number | undefined;
      let user_level: number | undefined;
      if (req.user) {
        await sequelize.transaction(async (t: Transaction) => {
          let firstRead = false;
          try {
            await sequelize.query(
              `INSERT INTO best_practice_reads (best_practice_id,user_id,first_read_at,last_read_at,read_count)
               VALUES (:bpId,:uid,NOW(),NOW(),1)`,
              { replacements: { bpId: id, uid: req.user!.id }, transaction: t }
            );
            firstRead = true;
          } catch (err: any) {
            const existing: any[] = await sequelize.query(
              `SELECT id, read_count FROM best_practice_reads WHERE best_practice_id = :bpId AND user_id = :uid FOR UPDATE`,
              {
                replacements: { bpId: id, uid: req.user!.id },
                type: QueryTypes.SELECT,
                transaction: t,
              }
            );
            if (existing.length) {
              await sequelize.query(
                `UPDATE best_practice_reads SET last_read_at = NOW(), read_count = read_count + 1 WHERE id = :rid`,
                {
                  replacements: { rid: (existing[0] as any).id },
                  transaction: t,
                }
              );
            } else {
              await sequelize.query(
                `INSERT INTO best_practice_reads (best_practice_id,user_id,first_read_at,last_read_at,read_count)
                 VALUES (:bpId,:uid,NOW(),NOW(),1)`,
                {
                  replacements: { bpId: id, uid: req.user!.id },
                  transaction: t,
                }
              );
              firstRead = true;
            }
            await sequelize
              .query(
                `DO $$ BEGIN
                   IF NOT EXISTS (
                     SELECT 1 FROM pg_constraint c
                     JOIN pg_class t ON c.conrelid = t.oid
                     WHERE t.relname = 'best_practice_reads' AND c.conname = 'uniq_bp_read_user'
                   ) THEN
                     BEGIN
                       ALTER TABLE best_practice_reads ADD CONSTRAINT uniq_bp_read_user UNIQUE (best_practice_id, user_id);
                     EXCEPTION WHEN others THEN
                     END;
                   END IF;
                 END $$;`,
                { transaction: t }
              )
              .catch(() => {});
          }
          await sequelize.query(
            `UPDATE best_practice_contents SET read_count = read_count + 1 WHERE id = :bpId`,
            { replacements: { bpId: id }, transaction: t }
          );

          if (firstRead) {
            // Award +1 via scoring service
            const scoringResult = await scoringService.recordEvents(
              [
                {
                  userId: req.user!.id,
                  actorUserId: req.user!.id,
                  type: "BEST_PRACTICE_FIRST_READ",
                  deltaPoints: Points.BEST_PRACTICE_FIRST_READ,
                  refType: "best_practice",
                  refId: String(id),
                  meta: { best_practice_id: id },
                },
              ],
              t
            );
            // Broadcast outside the transaction (after commit) using hook pattern
            // Save minimal batch for later emit
            const pendingBatch = scoringResult;
            // Defer broadcasting until after transaction commit
            (t as any).afterCommit(() => {
              try {
                try {
                  getWebSocketService().broadcastScoreEvents(pendingBatch);
                } catch (err) {
                  console.warn(
                    "[ws] broadcast skipped (service not ready)",
                    err
                  );
                }
              } catch (e) {
                console.warn("[ws] failed to broadcast first-read scoring", e);
              }
            });
            awarded_first_read = true;
            user_read_before = false; // before this request user had NOT read it
            const total = scoringResult.totals.find(
              (trow) => trow.userId === req.user!.id
            );
            if (total) {
              user_points = total.totalPoints / 1000; // convert from scaled
              user_level = mapPointsToLevel(Math.floor(user_points)).level;
            } else {
              // fallback load
              const existingTotal = await UserScoreTotal.findByPk(
                req.user!.id,
                { transaction: t }
              );
              if (existingTotal) {
                user_points = existingTotal.total_points / 1000;
                user_level = mapPointsToLevel(Math.floor(user_points)).level;
              }
            }
          } else {
            user_read_before = true; // already had a read row
            const existingTotal = await UserScoreTotal.findByPk(req.user!.id, {
              transaction: t,
            });
            if (existingTotal) {
              user_points = existingTotal.total_points / 1000;
              user_level = mapPointsToLevel(Math.floor(user_points)).level;
            }
          }
        });
      }

      // Prev/Next navigation by created_at within same first category (or overall if none)
      // Enhanced navigation: accept optional filter params to keep context consistent with list view
      // query params: search, category, created_by, published
      const { search, category, created_by, published } = req.query as Record<
        string,
        string | undefined
      >;
      const filterWhere: any = { is_deleted: false };
      if (published !== undefined)
        filterWhere.is_published = published === "true";
      else filterWhere.is_published = true; // detail nav constrained to published by default
      if (search) {
        filterWhere[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (category) {
        filterWhere.categories = { [Op.contains]: [category] } as any;
      }
      if (created_by && !isNaN(Number(created_by))) {
        filterWhere.created_by = Number(created_by);
      }

      // Build tuple comparison logic manually using raw queries for efficiency and tie-breaking on id
      // Build replacements defensively; ensure createdAt always present to avoid Sequelize named replacement error
      const replacementsRaw: Record<string, any> = {
        createdAt:
          (practice as any).created_at ||
          (practice as any).get?.("created_at") ||
          null,
        curId: practice.id,
        search: search ? `%${search}%` : undefined,
        category: category || undefined,
        created_by: created_by ? Number(created_by) : undefined,
        publishedFlag: filterWhere.is_published,
      };
      if (!replacementsRaw.createdAt) {
        // If still missing, skip navigation queries to prevent errors
        console.warn(
          "[bestPractices:getOne] Missing created_at on practice id=",
          practice.id,
          "—navigation disabled"
        );
      }
      // Strip undefined so we don't accidentally pass named params not used
      const replacements: Record<string, any> = {};
      Object.keys(replacementsRaw).forEach((k) => {
        if (replacementsRaw[k] !== undefined)
          replacements[k] = replacementsRaw[k];
      });

      // Dynamic WHERE fragment builder (excluding tuple comparison portion)
      const whereFrags: string[] = [
        "is_deleted = false",
        "is_published = :publishedFlag",
      ];
      if (search) {
        whereFrags.push("(title ILIKE :search OR description ILIKE :search)");
      }
      if (category) {
        whereFrags.push(":category = ANY(categories)");
      }
      if (created_by) {
        whereFrags.push("created_by = :created_by");
      }
      const baseWhereSql = whereFrags.join(" AND ");

      // Previous (newer) item relative to descending list: created_at > current OR tie & id > current
      const prevSql = `SELECT id FROM best_practice_contents
        WHERE ${baseWhereSql} AND (
          created_at > :createdAt OR (created_at = :createdAt AND id > :curId)
        )
        ORDER BY created_at ASC, id ASC
        LIMIT 1`;
      // Next (older) item: created_at < current OR tie & id < current
      const nextSql = `SELECT id FROM best_practice_contents
        WHERE ${baseWhereSql} AND (
          created_at < :createdAt OR (created_at = :createdAt AND id < :curId)
        )
        ORDER BY created_at DESC, id DESC
        LIMIT 1`;

      let prevItem: { id: number } | undefined;
      let nextItem: { id: number } | undefined;
      if (replacements.createdAt) {
        try {
          const [prevRows, nextRows] = await Promise.all([
            sequelize.query(prevSql, {
              replacements,
              type: QueryTypes.SELECT,
            }) as Promise<any[]>,
            sequelize.query(nextSql, {
              replacements,
              type: QueryTypes.SELECT,
            }) as Promise<any[]>,
          ]);
          prevItem = (prevRows as any[])[0];
          nextItem = (nextRows as any[])[0];
        } catch (navErr) {
          console.error("[bestPractices:getOne:navigationFallback]", navErr);
          prevItem = undefined;
          nextItem = undefined;
        }
      } else {
        prevItem = undefined;
        nextItem = undefined;
      }

      return res.json({
        practice: (() => {
          try {
            const json: any = practice.toJSON();
            if (req.user) {
              // read reflects POST-STATE: true if user has a read record now (whether previous or just created)
              json.read_before = user_read_before; // pre-state
              json.read = user_read_before || awarded_first_read ? true : false; // post-state
            }
            return json;
          } catch {
            return practice;
          }
        })(),
        navigation: {
          prevId: prevItem?.id || null,
          nextId: nextItem?.id || null,
        },
        scoring: req.user
          ? {
              awarded_first_read,
              points_delta: awarded_first_read
                ? Points.BEST_PRACTICE_FIRST_READ
                : 0,
              user_points: user_points ?? null,
              user_level: user_level ?? null,
            }
          : null,
      });
    } catch (e) {
      console.error("[bestPractices:getOne]", e);
      return res.status(500).json({ error: "Failed to fetch" });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const practice = await BestPracticeContent.findByPk(id);
      if (!practice || practice.is_deleted)
        return res.status(404).json({ error: "Not found" });
      // Ownership / permission checks handled by route-level middleware ideally
      const patch: any = {};
      const allowKeys = [
        "title",
        "description",
        "steps",
        "steps_json",
        "benefits",
        "benefits_json",
        "categories",
        "media",
        "is_published",
      ];
      for (const k of allowKeys) if (k in req.body) patch[k] = req.body[k];

      // Optional new upload on update
      const file = (req as any).file as Express.Multer.File | undefined;
      // Track old storage key for cleanup
      let oldStorageKey: string | undefined;
      let mediaCleared = false;
      if (file) {
        const mediaType = file.mimetype.startsWith("video/")
          ? "video"
          : "image";
        if (practice.media && (practice.media as any).storageKey) {
          oldStorageKey = (practice.media as any).storageKey;
        }
        const uploaded = await bpStorage().upload(file.buffer, {
          postId: `bp-${practice.id}`,
          mediaType: mediaType as any,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        });
        patch.media = {
          kind: mediaType,
          url: uploaded.url,
          thumbnail_url: uploaded.thumbnailUrl,
          originalName: file.originalname,
          storageKey: uploaded.storageKey,
        };
      } else if (patch.media === null) {
        // Explicit media removal request
        if (practice.media && (practice.media as any).storageKey) {
          oldStorageKey = (practice.media as any).storageKey;
        }
        mediaCleared = true;
      }
      if (patch.categories) {
        patch.categories = parseIncomingCategories(patch.categories);
      }
      if (patch.steps) {
        patch.steps_json = patch.steps;
        delete patch.steps;
      }
      if (patch.benefits) {
        patch.benefits_json = patch.benefits;
        delete patch.benefits;
      }
      // Always force publish (unless removed via separate delete endpoint)
      patch.is_published = true;
      await practice.update(patch);

      // Delete old media asset AFTER successful update (fire & forget)
      if (oldStorageKey && (file || mediaCleared)) {
        bpStorage()
          .delete(oldStorageKey)
          .catch((err: any) => {
            console.error(
              "[bestPractices:update] Failed to delete old media",
              oldStorageKey,
              err?.message || err
            );
          });
      }
      return res.json({ practice });
    } catch (e) {
      console.error("[bestPractices:update]", e);
      return res.status(500).json({ error: "Failed to update" });
    }
  }

  async remove(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const practice = await BestPracticeContent.findByPk(id);
      if (!practice || practice.is_deleted)
        return res.status(404).json({ error: "Not found" });
      // Capture media storage key before marking deleted
      let storageKey: string | undefined;
      if (practice.media && (practice.media as any).storageKey) {
        storageKey = (practice.media as any).storageKey;
      }
      await practice.update({ is_deleted: true, is_published: false });
      if (storageKey) {
        bpStorage()
          .delete(storageKey)
          .catch((err: any) => {
            console.error(
              "[bestPractices:remove] Failed to delete media",
              storageKey,
              err?.message || err
            );
          });
      }
      return res.status(204).send();
    } catch (e) {
      console.error("[bestPractices:remove]", e);
      return res.status(500).json({ error: "Failed to delete" });
    }
  }
}

export default new BestPracticeController();
