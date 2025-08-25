import { Request, Response } from "express";
import { Op, Transaction, QueryTypes } from "sequelize";
import sequelize from "../config/database";
import BestPracticeContent from "../models/BestPracticeContent";
import BestPracticeRead from "../models/BestPracticeRead";
import User from "../models/User";
import { StorageFactory } from "../services/storage/StorageFactory";
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
        categories,
        media,
        is_published,
      } = req.body;
      if (!title || !description) {
        return res
          .status(400)
          .json({ error: "title and description required" });
      }
      const stepsArr = Array.isArray(steps) ? steps : [];
      const benefitsArr = Array.isArray(benefits) ? benefits : [];
      const catArr = sanitizeCategories(categories);
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

      const created = await BestPracticeContent.create({
        title: String(title).trim(),
        description: String(description),
        steps_json: stepsArr,
        benefits_json: benefitsArr,
        categories: catArr,
        media: mediaPayload,
        is_published: !!is_published,
        language: "en",
        created_by: req.user.id,
      });
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

      // Record read receipt
      if (req.user) {
        await sequelize.transaction(async (t: Transaction) => {
          await sequelize.query(
            `INSERT INTO best_practice_reads (best_practice_id,user_id,first_read_at,last_read_at,read_count)
             VALUES (:bpId,:uid,NOW(),NOW(),1)
             ON CONFLICT (best_practice_id,user_id)
             DO UPDATE SET last_read_at=EXCLUDED.last_read_at, read_count=best_practice_reads.read_count+1`,
            { replacements: { bpId: id, uid: req.user!.id }, transaction: t }
          );
          await sequelize.query(
            `UPDATE best_practice_contents SET read_count = read_count + 1 WHERE id = :bpId`,
            { replacements: { bpId: id }, transaction: t }
          );
        });
      }

      // Prev/Next navigation by created_at within same first category (or overall if none)
      const catContext = practice.categories?.[0];
      const baseWhere: any = { is_deleted: false, is_published: true };
      if (catContext)
        baseWhere.categories = { [Op.contains]: [catContext] } as any;

      const [prevItem, nextItem] = await Promise.all([
        BestPracticeContent.findOne({
          where: { ...baseWhere, created_at: { [Op.lt]: practice.created_at } },
          order: [["created_at", "DESC"]],
          attributes: ["id"],
        }),
        BestPracticeContent.findOne({
          where: { ...baseWhere, created_at: { [Op.gt]: practice.created_at } },
          order: [["created_at", "ASC"]],
          attributes: ["id"],
        }),
      ]);

      return res.json({
        practice,
        navigation: {
          prevId: prevItem?.id || null,
          nextId: nextItem?.id || null,
        },
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
      if (patch.categories)
        patch.categories = sanitizeCategories(patch.categories);
      if (patch.steps) {
        patch.steps_json = patch.steps;
        delete patch.steps;
      }
      if (patch.benefits) {
        patch.benefits_json = patch.benefits;
        delete patch.benefits;
      }
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
