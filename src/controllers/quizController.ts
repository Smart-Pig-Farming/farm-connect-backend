import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import User from "../models/User";
import BestPracticeTag from "../models/BestPracticeTag";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";
import QuizAttempt from "../models/QuizAttempt";
import QuizAttemptAnswer from "../models/QuizAttemptAnswer";

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; permissions: string[] };
}

class QuizController {
  // Helper to compare selected vs correct option id sets (exact match + overlap count)
  private evaluateSelection(
    selectedRaw: number[] | undefined,
    correctRaw: number[]
  ) {
    const selected = Array.from(new Set((selectedRaw || []).map(Number))).sort(
      (a: number, b: number) => a - b
    );
    const correct = Array.from(new Set(correctRaw.map(Number))).sort(
      (a: number, b: number) => a - b
    );
    const overlap = selected.filter((id) => correct.includes(id)).length;
    const exact =
      selected.length === correct.length &&
      correct.every((id, i) => id === selected[i]);
    return { exact, overlap, selected, correct };
  }
  // GET /api/quizzes/stats -> counts per tag (active quizzes & total questions)
  async stats(_req: AuthRequest, res: Response) {
    try {
      const rows = await sequelize.query(
        `SELECT t.id as tag_id, t.name as tag_name,
                COUNT(DISTINCT q.id)::int as quiz_count,
                COALESCE(SUM(qc.question_count),0)::int as question_count
         FROM best_practice_tags t
         LEFT JOIN quizzes q ON q.best_practice_tag_id = t.id AND q.is_active = true
         LEFT JOIN LATERAL (
           SELECT quiz_id, COUNT(*) as question_count
           FROM quiz_questions qq WHERE qq.quiz_id = q.id GROUP BY quiz_id
         ) qc ON qc.quiz_id = q.id
         GROUP BY t.id, t.name
         ORDER BY t.name ASC`,
        { type: QueryTypes.SELECT }
      );
      return res.json({ tags: rows });
    } catch (e) {
      console.error("[quizzes:stats]", e);
      return res.status(500).json({ error: "Failed to fetch stats" });
    }
  }

  // POST /api/quizzes
  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const {
        title,
        description,
        duration,
        passing_score,
        best_practice_tag_id,
      } = req.body;
      if (!title || !description || !best_practice_tag_id) {
        return res
          .status(400)
          .json({ error: "title, description, best_practice_tag_id required" });
      }
      const quiz = await Quiz.create({
        title: String(title).trim(),
        description: String(description),
        duration: duration ? Number(duration) : 30,
        passing_score: passing_score ? Number(passing_score) : 70,
        best_practice_tag_id: Number(best_practice_tag_id),
        created_by: req.user.id,
      });
      return res.status(201).json({ quiz });
    } catch (e) {
      console.error("[quizzes:create]", e);
      return res.status(500).json({ error: "Failed to create quiz" });
    }
  }

  // GET /api/quizzes (cursor pagination by created_at DESC)
  async list(req: AuthRequest, res: Response) {
    try {
      const { limit = 10, cursor, search = "", tag_id, active } = req.query;
      const limitNum = Math.min(50, Number(limit) || 10);
      const useCursor = Object.prototype.hasOwnProperty.call(
        req.query,
        "cursor"
      );
      const where: any = {};
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (tag_id) where.best_practice_tag_id = Number(tag_id);
      if (active !== undefined) where.is_active = active === "true";
      if (cursor && typeof cursor === "string" && cursor.trim()) {
        where.created_at = { [Op.lt]: new Date(cursor) };
      }
      const rows = await Quiz.findAll({
        where,
        order: [
          ["created_at", "DESC"],
          ["id", "DESC"],
        ],
        limit: useCursor ? limitNum + 1 : limitNum,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstname", "lastname"],
          },
          {
            model: BestPracticeTag,
            as: "bestPracticeTag",
            attributes: ["id", "name"],
          },
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
      return res.json({
        items,
        pageInfo: { hasNextPage, nextCursor },
      });
    } catch (e) {
      console.error("[quizzes:list]", e);
      return res.status(500).json({ error: "Failed to list quizzes" });
    }
  }

  // GET /api/quizzes/:id (with questions summary counts)
  async getOne(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    try {
      const quiz = await Quiz.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstname", "lastname"],
          },
          {
            model: BestPracticeTag,
            as: "bestPracticeTag",
            attributes: ["id", "name"],
          },
          {
            model: QuizQuestion,
            as: "questions",
            include: [{ model: QuizQuestionOption, as: "options" }],
          },
        ],
      });
      if (!quiz) return res.status(404).json({ error: "Not found" });
      // Mask correct answers for non-managers
      const canSeeAnswers = req.user?.permissions?.some(
        (p) => p.includes("MANAGE:QUIZZES") || p.includes("UPDATE:QUIZZES")
      );
      const sanitized = quiz.toJSON() as any;
      if (!canSeeAnswers && sanitized.questions) {
        for (const q of sanitized.questions) {
          if (q.options) {
            for (const o of q.options) {
              delete o.is_correct;
            }
          }
        }
      }
      return res.json({ quiz: sanitized });
    } catch (e) {
      console.error("[quizzes:getOne]", e);
      return res.status(500).json({ error: "Failed to fetch quiz" });
    }
  }

  // PATCH /api/quizzes/:id
  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const quiz = await Quiz.findByPk(id);
      if (!quiz) return res.status(404).json({ error: "Not found" });
      const allowed = [
        "title",
        "description",
        "duration",
        "passing_score",
        "is_active",
        "best_practice_tag_id",
      ];
      const patch: any = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      await quiz.update(patch);
      return res.json({ quiz });
    } catch (e) {
      console.error("[quizzes:update]", e);
      return res.status(500).json({ error: "Failed to update quiz" });
    }
  }

  // DELETE /api/quizzes/:id (soft deactivate)
  async remove(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const quiz = await Quiz.findByPk(id);
      if (!quiz) return res.status(404).json({ error: "Not found" });
      await quiz.update({ is_active: false });
      return res.status(204).send();
    } catch (e) {
      console.error("[quizzes:remove]", e);
      return res.status(500).json({ error: "Failed to delete quiz" });
    }
  }

  // QUESTION OPERATIONS

  // POST /api/quizzes/:quizId/questions
  async createQuestion(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const quizId = Number(req.params.quizId);
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      const { text, explanation, order_index, options } = req.body;
      if (!text) return res.status(400).json({ error: "text required" });
      let opts: any[] = [];
      if (Array.isArray(options)) opts = options;
      else if (typeof options === "string") {
        try {
          const parsed = JSON.parse(options);
          if (Array.isArray(parsed)) opts = parsed;
        } catch {}
      }
      if (!opts.length)
        return res.status(400).json({ error: "At least one option required" });
      const correctCount = opts.filter((o) => !!o.is_correct).length;
      if (correctCount === 0)
        return res
          .status(400)
          .json({ error: "At least one correct option required" });
      const question = await QuizQuestion.create({
        quiz_id: quizId,
        text: String(text),
        explanation: explanation ? String(explanation) : null,
        order_index: order_index ? Number(order_index) : 0,
        type: "mcq",
        difficulty: "medium",
        is_active: true,
        is_deleted: false,
      });
      for (const [i, o] of opts.entries()) {
        if (!o || typeof o.text !== "string") continue;
        await QuizQuestionOption.create({
          question_id: question.id,
          text: o.text,
          is_correct: !!o.is_correct,
          order_index: typeof o.order_index === "number" ? o.order_index : i,
          is_deleted: false,
        });
      }
      const full = await QuizQuestion.findByPk(question.id, {
        include: [{ model: QuizQuestionOption, as: "options" }],
      });
      const createdObj: any = full?.toJSON ? full.toJSON() : full;
      if (createdObj && createdObj.id && !createdObj.question_id)
        createdObj.question_id = createdObj.id;
      return res.status(201).json({ question: createdObj });
    } catch (e) {
      console.error("[quizQuestions:create]", e);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  // GET /api/quizzes/:quizId/questions
  async listQuestions(req: AuthRequest, res: Response) {
    try {
      const quizId = Number(req.params.quizId);
      const {
        limit = 20,
        offset = 0,
        search = "",
        difficulty,
        type,
        random,
      } = req.query as any;
      const limitNum = Math.min(100, Number(limit) || 20);
      const offsetNum = Math.max(0, Number(offset) || 0);
      const where: any = { quiz_id: quizId };

      // Difficulty filter (supports comma-separated list)
      if (difficulty) {
        const diffs = String(difficulty)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        if (diffs.length === 1) where.difficulty = diffs[0];
        else if (diffs.length > 1) where.difficulty = { [Op.in]: diffs };
      }

      // Type filter (supports comma-separated list)
      if (type) {
        let types = String(type)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          // Allow legacy UI value 'boolean' as synonym for enum 'truefalse'
          .map((t) => (t === "boolean" ? "truefalse" : t));
        if (types.length === 1) where.type = types[0];
        else if (types.length > 1) where.type = { [Op.in]: types };
      }

      // Text search across question text & explanation
      if (search && typeof search === "string" && search.trim()) {
        where[Op.or] = [
          { text: { [Op.iLike]: `%${search.trim()}%` } },
          { explanation: { [Op.iLike]: `%${search.trim()}%` } },
        ];
      }
      const total = await QuizQuestion.count({ where });
      const order = random
        ? (sequelize.random() as any)
        : [
            ["order_index", "ASC"],
            ["id", "ASC"],
          ];
      const items = await QuizQuestion.findAll({
        where,
        order: Array.isArray(order) ? (order as any) : undefined,
        // If random is true we rely on DB random order, else deterministic ordering
        ...(random ? { order: sequelize.random() as any } : {}),
        limit: limitNum,
        offset: offsetNum,
        include: [{ model: QuizQuestionOption, as: "options" }],
      });
      const canSeeAnswers = req.user?.permissions?.some(
        (p) => p.includes("MANAGE:QUIZZES") || p.includes("UPDATE:QUIZZES")
      );
      const sanitized = items.map((q) => {
        const obj: any = q.toJSON();
        // Provide a stable question_id alias expected by some frontend consumers
        if (obj && obj.id && !obj.question_id) obj.question_id = obj.id;
        if (!canSeeAnswers && obj.options) {
          for (const o of obj.options) delete o.is_correct;
        }
        return obj;
      });
      const nextOffset = offsetNum + items.length;
      const hasMore = nextOffset < total;
      return res.json({
        items: sanitized,
        pageInfo: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasNextPage: hasMore,
          nextOffset: hasMore ? nextOffset : null,
        },
      });
    } catch (e) {
      console.error("[quizQuestions:list]", e);
      return res.status(500).json({ error: "Failed to list questions" });
    }
  }

  // GET /api/quiz-questions/:id
  async getQuestion(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    try {
      const question = await QuizQuestion.findByPk(id, {
        include: [
          { model: QuizQuestionOption, as: "options" },
          { model: Quiz, as: "quiz", attributes: ["id", "title"] },
        ],
      });
      if (!question) return res.status(404).json({ error: "Not found" });
      const canSeeAnswers = req.user?.permissions?.some(
        (p) => p.includes("MANAGE:QUIZZES") || p.includes("UPDATE:QUIZZES")
      );
      const obj: any = question.toJSON();
      if (obj && obj.id && !obj.question_id) obj.question_id = obj.id;
      if (!canSeeAnswers && obj.options)
        obj.options.forEach((o: any) => delete o.is_correct);
      return res.json({ question: obj });
    } catch (e) {
      console.error("[quizQuestions:getOne]", e);
      return res.status(500).json({ error: "Failed to fetch question" });
    }
  }

  // PATCH /api/quiz-questions/:id
  async updateQuestion(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const question = await QuizQuestion.findByPk(id, {
        include: [{ model: QuizQuestionOption, as: "options" }],
      });
      if (!question) return res.status(404).json({ error: "Not found" });
      const { text, explanation, order_index, options, type, difficulty } =
        req.body;
      const patch: any = {};
      if (text !== undefined) patch.text = String(text);
      if (explanation !== undefined)
        patch.explanation = explanation ? String(explanation) : null;
      if (order_index !== undefined) patch.order_index = Number(order_index);
      // Allow updating type & difficulty if provided and valid
      if (type !== undefined) {
        const allowedTypes = ["mcq", "multi", "truefalse"];
        if (!allowedTypes.includes(type))
          return res.status(400).json({ error: "Invalid type" });
        patch.type = type;
      }
      if (difficulty !== undefined) {
        const allowedDiffs = ["easy", "medium", "hard"];
        if (!allowedDiffs.includes(difficulty))
          return res.status(400).json({ error: "Invalid difficulty" });
        patch.difficulty = difficulty;
      }
      await question.update(patch);
      // Optional options update (replace strategy)
      if (options !== undefined) {
        let opts: any[] = [];
        if (Array.isArray(options)) opts = options;
        else if (typeof options === "string") {
          try {
            const parsed = JSON.parse(options);
            if (Array.isArray(parsed)) opts = parsed;
          } catch {}
        }
        // Remove existing options then re-create (simpler initial approach)
        await QuizQuestionOption.destroy({
          where: { question_id: question.id },
        });
        for (const [i, o] of opts.entries()) {
          if (!o || typeof o.text !== "string") continue;
          await QuizQuestionOption.create({
            question_id: question.id,
            text: o.text,
            is_correct: !!o.is_correct,
            order_index: typeof o.order_index === "number" ? o.order_index : i,
            is_deleted: false,
          });
        }
      }
      const full = await QuizQuestion.findByPk(question.id, {
        include: [{ model: QuizQuestionOption, as: "options" }],
      });
      const updatedObj: any = full?.toJSON ? full.toJSON() : full;
      if (updatedObj && updatedObj.id && !updatedObj.question_id)
        updatedObj.question_id = updatedObj.id;
      return res.json({ question: updatedObj });
    } catch (e) {
      console.error("[quizQuestions:update]", e);
      return res.status(500).json({ error: "Failed to update question" });
    }
  }

  // DELETE /api/quiz-questions/:id
  async removeQuestion(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const id = Number(req.params.id);
      const question = await QuizQuestion.findByPk(id);
      if (!question) return res.status(404).json({ error: "Not found" });
      await question.destroy();
      return res.status(204).send();
    } catch (e) {
      console.error("[quizQuestions:remove]", e);
      return res.status(500).json({ error: "Failed to delete question" });
    }
  }

  // ATTEMPT OPERATIONS
  // POST /api/quizzes/:id/attempts
  async startAttempt(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const quizId = Number(req.params.id);
      const { question_count = 10, shuffle = true } = req.body || {};
      const expectedCount = Number(question_count) || 10; // enforce minimum set size requirement
      const now = new Date();
      // 1. Cleanup expired in-progress attempts (mark as expired so they don't count)
      const staleAttempts = await QuizAttempt.findAll({
        where: {
          quiz_id: quizId,
          user_id: req.user.id,
          submitted_at: null,
          status: "in_progress",
        },
      });
      for (const a of staleAttempts) {
        if (a.expires_at && a.expires_at < now) {
          await a.update({ status: "expired" });
        }
      }
      // 2. Reuse existing in-progress attempt if any (idempotent start)
      const existing = await QuizAttempt.findOne({
        where: {
          quiz_id: quizId,
          user_id: req.user.id,
          submitted_at: null,
          status: "in_progress",
        },
        order: [["started_at", "DESC"]],
      });
      if (existing) {
        const snapshot: any[] = Array.isArray(
          existing.attempt_questions_snapshot
        )
          ? (existing.attempt_questions_snapshot as any[])
          : [];
        if (snapshot.length === 0) {
          // No questions persisted somehow; expire & force fresh start
          await existing.update({ status: "expired" });
        } else {
          // Reuse existing attempt even if it was a partial set (coherent UX)
          const sanitizedQuestions = snapshot.map((q) => ({
            id: q.id,
            text: q.text || q.prompt,
            prompt: q.text || q.prompt,
            type: q.type,
            difficulty: q.difficulty,
            explanation: q.explanation,
            options: (q.options || []).map((o: any) => ({
              id: o.id,
              text: o.text,
            })),
          }));
          const requested = expectedCount;
          const served = sanitizedQuestions.length;
          const partial = served < requested;
          return res.status(200).json({
            attempt: {
              id: existing.id,
              quiz_id: quizId,
              started_at: existing.started_at,
              expires_at: existing.expires_at,
              duration_seconds: existing.duration_seconds_snapshot,
              status: existing.status,
            },
            quiz: await (async () => {
              const quizLite = await Quiz.findByPk(quizId, {
                attributes: ["id", "title", "description", "passing_score"],
              });
              return quizLite || { id: quizId };
            })(),
            questions: sanitizedQuestions,
            requested_question_count: requested,
            served_question_count: served,
            partial_set: partial,
            shortfall: partial ? requested - served : 0,
            reused: true,
          });
        }
      }
      // 3. Rate limit after reuse check: max 5 active (unsubmitted) attempts per quiz per user
      const activeCount = await QuizAttempt.count({
        where: {
          quiz_id: quizId,
          user_id: req.user.id,
          submitted_at: null,
          status: "in_progress",
        },
      });
      if (activeCount >= 5)
        return res.status(429).json({ error: "Too many active attempts" });
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz || !quiz.is_active)
        return res.status(404).json({ error: "Quiz not found" });
      // Fetch active non-deleted questions (without relying on eager include to avoid intermittent empty associations)
      const rawQuestions = await QuizQuestion.findAll({
        where: { quiz_id: quizId, is_active: true, is_deleted: false },
        order: sequelize.random(),
        limit: Math.min(50, expectedCount),
      });
      if (rawQuestions.length === 0) {
        return res.status(409).json({
          error: "No questions available",
          code: "NO_QUESTIONS",
        });
      }
      // Always fetch options in a separate query & attach them
      const qIds = rawQuestions.map((q) => q.id);
      // Fetch options in bulk. IMPORTANT: assign via setDataValue so toJSON includes them.
      const optionRows = await QuizQuestionOption.findAll({
        where: { question_id: qIds, is_deleted: false },
        order: [
          ["order_index", "ASC"],
          ["id", "ASC"],
        ],
      });
      const optionsByQ: Record<number, QuizQuestionOption[]> = {} as any;
      optionRows.forEach((o: any) => {
        if (!optionsByQ[o.question_id]) optionsByQ[o.question_id] = [];
        optionsByQ[o.question_id].push(o);
      });
      for (const q of rawQuestions) {
        // Use setDataValue so that q.toJSON() contains the injected association-like data.
        const opts = (optionsByQ[q.id] || []).map((o: any) => {
          const plain = o.toJSON ? o.toJSON() : { ...o };
          return {
            id: plain.id,
            question_id: plain.question_id,
            text: plain.text,
            // Do NOT expose is_correct here (removed later anyway) but keep for snapshot build.
            is_correct: plain.is_correct,
            order_index: plain.order_index,
          };
        });
        (q as any).setDataValue("options", opts);
      }
      const zeroOptionQuestions = rawQuestions.filter((q: any) => {
        const opts =
          (typeof q.get === "function"
            ? (q as any).get("options")
            : (q as any).options) || [];
        return !Array.isArray(opts) || opts.length === 0;
      });
      if (zeroOptionQuestions.length) {
        return res.status(409).json({
          error: `Some questions have no options (ids: ${zeroOptionQuestions
            .map((q) => q.id)
            .join(",")})`,
          code: "QUESTIONS_WITHOUT_OPTIONS",
          question_ids: zeroOptionQuestions.map((q) => q.id),
        });
      }
      // Allow partial sets: proceed if at least 1 question available
      const isPartial = rawQuestions.length < expectedCount;
      const questions = shuffle
        ? rawQuestions.map((q) => {
            const opts =
              (typeof q.get === "function"
                ? (q as any).get("options")
                : (q as any).options) || [];
            if (Array.isArray(opts) && opts.length > 1) {
              const shuffled = [...opts].sort(() => Math.random() - 0.5);
              (q as any).setDataValue("options", shuffled);
            }
            return q;
          })
        : rawQuestions;
      // Filter out any questions with zero options (data integrity safeguard)
      const withOptions = questions.filter((q) => {
        const obj: any = q.toJSON();
        return Array.isArray(obj.options) && obj.options.length > 0;
      });
      if (withOptions.length === 0) {
        return res.status(409).json({
          error: "No questions with options available",
          code: "NO_OPTIONS",
          requested: expectedCount,
          available_questions: questions.length,
        });
      }
      if (withOptions.length < questions.length) {
        // Adjust served list to only those with options
        console.warn(
          `[quizAttempts:start] Excluding ${
            questions.length - withOptions.length
          } questions lacking options`
        );
      }
      const finalQuestions = withOptions;
      const servedIds = finalQuestions.map((q) => q.id);
      const startedAt = new Date();
      const durationSeconds = quiz.duration * 60; // quiz.duration in minutes
      const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      // Build immutable snapshot BEFORE sanitizing
      const snapshot = finalQuestions.map((q) => {
        const obj: any = q.toJSON();
        return {
          id: obj.id,
          text: obj.text,
          prompt: obj.text,
          type: obj.type,
          difficulty: obj.difficulty,
          explanation: obj.explanation,
          options: (obj.options || []).map((o: any) => ({
            id: o.id,
            text: o.text,
            is_correct: !!o.is_correct,
          })),
        };
      });
      const attempt = await QuizAttempt.create({
        quiz_id: quizId,
        user_id: req.user.id,
        duration_seconds_snapshot: durationSeconds,
        started_at: startedAt,
        expires_at: expiresAt,
        served_question_ids: servedIds,
        total_questions: servedIds.length,
        question_order: servedIds,
        passing_score_snapshot: quiz.passing_score,
        status: "in_progress",
        attempt_questions_snapshot: snapshot,
      });
      // sanitize answers
      const sanitizedQuestions = finalQuestions.map((q) => {
        const obj: any = q.toJSON();
        // Provide a stable question_id alias for attempt consumption
        if (obj && obj.id && !obj.question_id) obj.question_id = obj.id;
        if (!obj.prompt) obj.prompt = obj.text;
        if (obj.options) obj.options.forEach((o: any) => delete o.is_correct);
        return obj;
      });
      return res.status(201).json({
        attempt: {
          id: attempt.id,
          quiz_id: quizId,
          started_at: attempt.started_at,
          expires_at: attempt.expires_at,
          duration_seconds: durationSeconds,
          status: attempt.status,
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passing_score: quiz.passing_score,
        },
        questions: sanitizedQuestions,
        requested_question_count: expectedCount,
        served_question_count: sanitizedQuestions.length,
        partial_set: isPartial,
        shortfall: isPartial ? expectedCount - sanitizedQuestions.length : 0,
        reused: false,
      });
    } catch (e) {
      console.error("[quizAttempts:start]", e);
      return res.status(500).json({ error: "Failed to start attempt" });
    }
  }

  // POST /api/quizzes/:id/attempts/:attemptId/submit
  async submitAttempt(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const quizId = Number(req.params.id);
      const attemptId = Number(req.params.attemptId);
      const attempt = await QuizAttempt.findByPk(attemptId);
      if (
        !attempt ||
        attempt.quiz_id !== quizId ||
        attempt.user_id !== req.user.id
      )
        return res.status(404).json({ error: "Attempt not found" });
      if (attempt.submitted_at)
        return res.status(400).json({ error: "Already submitted" });
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      // enforce duration
      const now = new Date();
      const expiry = new Date(
        attempt.started_at.getTime() + quiz.duration * 60000
      );
      const timeExceeded = now > expiry;
      const answersPayload: any[] = Array.isArray(req.body.answers)
        ? req.body.answers
        : [];
      const servedIds: number[] = Array.isArray(attempt.served_question_ids)
        ? (attempt.served_question_ids as any)
        : [];
      const questions = await QuizQuestion.findAll({
        where: { id: servedIds },
      });
      const options = await QuizQuestionOption.findAll({
        where: { question_id: servedIds },
      });
      const answersByQ: Record<number, number[]> = {};
      for (const a of answersPayload) {
        const qid = Number(a.question_id);
        if (!servedIds.includes(qid)) continue; // ignore invalid
        const arr = Array.isArray(a.option_ids) ? a.option_ids.map(Number) : [];
        answersByQ[qid] = Array.from(new Set(arr));
      }
      let correctCount = 0;
      const totalCount = servedIds.length;
      for (const qid of servedIds) {
        const qOpts = options.filter((o) => o.question_id === qid);
        const correctOpts = qOpts.filter((o) => o.is_correct).map((o) => o.id);
        const { exact } = this.evaluateSelection(answersByQ[qid], correctOpts);
        if (exact) correctCount++;
        // persist chosen selections
        for (const optId of answersByQ[qid] || []) {
          const opt = qOpts.find((o) => o.id === optId);
          if (!opt) continue;
          await QuizAttemptAnswer.create({
            attempt_id: attempt.id,
            question_id: qid,
            option_id: optId,
            is_correct_snapshot: !!opt.is_correct,
          });
        }
      }
      const scorePercent = totalCount
        ? Math.round((correctCount / totalCount) * 100)
        : 0;
      const passed = scorePercent >= quiz.passing_score;
      await attempt.update({
        submitted_at: now,
        score_raw: correctCount,
        score_percent: scorePercent,
        score_points: correctCount.toFixed(3),
        passed,
        status: timeExceeded ? "expired" : "completed",
      });
      // Construct breakdown from snapshot for immediate review
      let breakdown: any[] = [];
      if (Array.isArray(attempt.attempt_questions_snapshot)) {
        const snapshotMap: Record<number, any> = {};
        (attempt.attempt_questions_snapshot as any[]).forEach(
          (q: any) => (snapshotMap[q.id] = q)
        );
        breakdown = servedIds.map((qid) => {
          const snap = snapshotMap[qid];
          const chosen = answersByQ[qid] || [];
          const correctOptionIds = (snap?.options || [])
            .filter((o: any) => o.is_correct)
            .map((o: any) => o.id);
          const { exact, overlap } = this.evaluateSelection(
            chosen,
            correctOptionIds
          );
          return {
            question_id: qid,
            prompt: snap?.text,
            type: snap?.type,
            difficulty: snap?.difficulty,
            explanation: snap?.explanation,
            selected_option_ids: chosen,
            correct_option_ids: correctOptionIds.sort(
              (a: number, b: number) => a - b
            ),
            correct: exact,
            partial: !exact && overlap > 0,
          };
        });
      }
      // Scoring: award quiz completion points
      let scoring: any = null;
      try {
        const { Points } = await import("../services/scoring/ScoreTypes");
        const scoringService = (
          await import("../services/scoring/ScoringService")
        ).default;
        const { mapPointsToLevel } = await import(
          "../services/scoring/LevelService"
        );
        const { getWebSocketService } = await import(
          "../services/webSocketService"
        );
        const delta = passed
          ? Points.QUIZ_COMPLETED_PASS
          : Points.QUIZ_COMPLETED_FAIL;
        const eventType = passed
          ? "QUIZ_COMPLETED_PASS"
          : "QUIZ_COMPLETED_FAIL";
        const batch = await scoringService.recordEvents([
          {
            userId: req.user.id,
            actorUserId: req.user.id,
            type: eventType as any,
            deltaPoints: delta,
            refType: "quiz_attempt",
            refId: String(attempt.id),
            meta: {
              quiz_id: quizId,
              attempt_id: attempt.id,
              percent: scorePercent,
            },
          },
        ]);
        // Broadcast
        try {
          getWebSocketService().broadcastScoreEvents(batch);
        } catch (e) {
          console.warn("[quizAttempts:submit][ws] not initialized", e);
        }
        const total = batch.totals.find((t) => t.userId === req.user!.id);
        if (total) {
          const totalPointsUnscaled = total.totalPoints / 1000;
          const lvlInfo = mapPointsToLevel(Math.floor(totalPointsUnscaled));
          scoring = {
            points_delta: delta,
            user_points: totalPointsUnscaled,
            user_level: lvlInfo.level,
            level_label: lvlInfo.label,
            next_level_at: lvlInfo.nextLevelAt,
            awarded_event_type: eventType,
          };
        }
      } catch (scErr) {
        console.warn("[quizAttempts:submit][scoring] failed", scErr);
      }

      return res.json({
        attempt: {
          id: attempt.id,
          quiz_id: quizId,
          score_raw: correctCount,
          score_percent: scorePercent,
          score_points: correctCount,
          passed,
          submitted_at: now,
          time_exceeded: timeExceeded,
          total_questions: totalCount,
          status: attempt.status,
        },
        breakdown,
        scoring,
      });
    } catch (e) {
      console.error("[quizAttempts:submit]", e);
      return res.status(500).json({ error: "Failed to submit attempt" });
    }
  }

  // GET /api/quizzes/:id/attempts/:attemptId
  async getAttempt(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const { id, attemptId } = req.params as any;
      const attempt = await QuizAttempt.findByPk(Number(attemptId));
      if (
        !attempt ||
        attempt.quiz_id !== Number(id) ||
        attempt.user_id !== req.user.id
      )
        return res.status(404).json({ error: "Attempt not found" });
      // compute remaining seconds
      const now = new Date();
      let remaining = null;
      if (attempt.expires_at && !attempt.submitted_at) {
        remaining = Math.max(
          0,
          Math.floor((attempt.expires_at.getTime() - now.getTime()) / 1000)
        );
      }
      // fetch served questions for resume
      let questions: any[] = [];
      if (Array.isArray(attempt.served_question_ids)) {
        const rows = await QuizQuestion.findAll({
          where: { id: attempt.served_question_ids },
          include: [{ model: QuizQuestionOption, as: "options" }],
        });
        const orderMap: Record<number, number> = {};
        (attempt.question_order || []).forEach(
          (qid, idx) => (orderMap[qid] = idx)
        );
        rows.sort((a, b) => (orderMap[a.id] || 0) - (orderMap[b.id] || 0));
        questions = rows.map((q) => {
          const obj: any = q.toJSON();
          if (obj && obj.id && !obj.question_id) obj.question_id = obj.id;
          if (!obj.prompt) obj.prompt = obj.text;
          if (
            attempt.status === "in_progress" ||
            attempt.status === "expired"
          ) {
            if (obj.options)
              obj.options.forEach((o: any) => delete o.is_correct);
          }
          return obj;
        });
      }
      // aggregate answers
      const answerRows = await QuizAttemptAnswer.findAll({
        where: { attempt_id: attempt.id },
      });
      const answers: Record<number, number[]> = {};
      for (const r of answerRows) {
        if (!answers[r.question_id]) answers[r.question_id] = [];
        answers[r.question_id].push(r.option_id);
      }
      const base = {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        status: attempt.status,
        expires_at: attempt.expires_at,
        remaining_seconds: remaining,
        score_percent: attempt.score_percent,
        score_raw: attempt.score_raw,
        passed: attempt.passed,
        total_questions: attempt.total_questions,
      };
      // If completed, attach breakdown for convenience (lightweight)
      let breakdown: any[] | undefined = undefined;
      if (
        attempt.status !== "in_progress" &&
        Array.isArray(attempt.attempt_questions_snapshot)
      ) {
        const snapshotMap: Record<number, any> = {};
        (attempt.attempt_questions_snapshot as any[]).forEach(
          (q: any) => (snapshotMap[q.id] = q)
        );
        const orderedIds =
          attempt.question_order ||
          Object.keys(snapshotMap).map((k) => Number(k));
        breakdown = orderedIds
          .map((qid: any) => {
            const snap = snapshotMap[qid];
            if (!snap) return null;
            const selected = answers[qid] || [];
            const correctOptionIds = (snap.options || [])
              .filter((o: any) => o.is_correct)
              .map((o: any) => o.id);
            const { exact, overlap } = this.evaluateSelection(
              selected,
              correctOptionIds
            );
            return {
              question_id: qid,
              prompt: snap.text,
              type: snap.type,
              difficulty: snap.difficulty,
              explanation: snap.explanation,
              selected_option_ids: selected,
              correct_option_ids: correctOptionIds.sort(
                (a: number, b: number) => a - b
              ),
              correct: exact,
              partial: !exact && overlap > 0,
            };
          })
          .filter(Boolean);
      }
      return res.json({ attempt: base, questions, answers, breakdown });
    } catch (e) {
      console.error("[quizAttempts:get]", e);
      return res.status(500).json({ error: "Failed to fetch attempt" });
    }
  }

  // GET /api/quizzes/:id/attempts/:attemptId/review (explicit review endpoint)
  async reviewAttempt(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const quizId = Number(req.params.id);
      const attemptId = Number(req.params.attemptId);
      const attempt = await QuizAttempt.findByPk(attemptId);
      if (
        !attempt ||
        attempt.quiz_id !== quizId ||
        attempt.user_id !== req.user.id
      )
        return res.status(404).json({ error: "Attempt not found" });
      if (!attempt.submitted_at)
        return res.status(400).json({ error: "Attempt not yet submitted" });
      const answerRows = await QuizAttemptAnswer.findAll({
        where: { attempt_id: attempt.id },
      });
      const answersByQ: Record<number, number[]> = {};
      for (const r of answerRows) {
        if (!answersByQ[r.question_id]) answersByQ[r.question_id] = [];
        answersByQ[r.question_id].push(r.option_id);
      }
      const snapshot: any[] = Array.isArray(attempt.attempt_questions_snapshot)
        ? (attempt.attempt_questions_snapshot as any[])
        : [];
      const order = attempt.question_order || snapshot.map((q: any) => q.id);
      const snapMap: Record<number, any> = {};
      snapshot.forEach((q: any) => (snapMap[q.id] = q));
      const breakdown = order
        .map((qid: number) => {
          const snap = snapMap[qid];
          if (!snap) return null;
          const selected = answersByQ[qid] || [];
          const correctIds = (snap.options || [])
            .filter((o: any) => o.is_correct)
            .map((o: any) => o.id);
          const { exact, overlap } = this.evaluateSelection(
            selected,
            correctIds
          );
          return {
            question_id: qid,
            prompt: snap.text,
            type: snap.type,
            difficulty: snap.difficulty,
            explanation: snap.explanation,
            selected_option_ids: Array.from(new Set(selected as number[])).sort(
              (a: number, b: number) => a - b
            ),
            correct_option_ids: Array.from(
              new Set(correctIds as number[])
            ).sort((a: number, b: number) => a - b),
            correct: exact,
            partial: !exact && overlap > 0,
            options: snap.options.map((o: any) => ({
              id: o.id,
              text: o.text,
              is_correct: o.is_correct,
            })),
          };
        })
        .filter(Boolean);
      return res.json({
        attempt: {
          id: attempt.id,
          quiz_id: attempt.quiz_id,
          submitted_at: attempt.submitted_at,
          score_percent: attempt.score_percent,
          score_raw: attempt.score_raw,
          total_questions: attempt.total_questions,
          passed: attempt.passed,
          status: attempt.status,
        },
        breakdown,
      });
    } catch (e) {
      console.error("[quizAttempts:review]", e);
      return res.status(500).json({ error: "Failed to review attempt" });
    }
  }

  // PATCH /api/quizzes/:id/attempts/:attemptId/answers (incremental save)
  async saveAttemptAnswer(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Auth required" });
      const quizId = Number(req.params.id);
      const attemptId = Number(req.params.attemptId);
      const { question_id, selected_option_ids, option_ids } = req.body || {};
      const attempt = await QuizAttempt.findByPk(attemptId);
      if (
        !attempt ||
        attempt.quiz_id !== quizId ||
        attempt.user_id !== req.user.id
      )
        return res.status(404).json({ error: "Attempt not found" });
      if (attempt.submitted_at)
        return res.status(400).json({ error: "Attempt already submitted" });
      if (attempt.expires_at && new Date() > attempt.expires_at)
        return res.status(400).json({ error: "Attempt expired" });
      if (!Array.isArray(attempt.served_question_ids))
        return res.status(400).json({ error: "Attempt missing question set" });
      const qid = Number(question_id);
      if (!qid || !attempt.served_question_ids.includes(qid))
        return res.status(400).json({ error: "Invalid question_id" });
      const incoming =
        selected_option_ids !== undefined ? selected_option_ids : option_ids;
      const optionIds: number[] = Array.isArray(incoming)
        ? Array.from(new Set(incoming.map(Number)))
        : [];
      // Remove existing selections for this question
      await QuizAttemptAnswer.destroy({
        where: { attempt_id: attempt.id, question_id: qid },
      });
      if (optionIds.length) {
        const opts = await QuizQuestionOption.findAll({
          where: { question_id: qid },
        });
        for (const oid of optionIds) {
          const opt = opts.find((o) => o.id === oid);
          if (!opt) continue;
          await QuizAttemptAnswer.create({
            attempt_id: attempt.id,
            question_id: qid,
            option_id: oid,
            is_correct_snapshot: !!opt.is_correct,
          });
        }
      }
      return res.json({
        saved: true,
        question_id: qid,
        selected_option_ids: optionIds,
      });
    } catch (e) {
      console.error("[quizAttempts:saveAnswer]", e);
      return res.status(500).json({ error: "Failed to save answer" });
    }
  }

  // GET /api/quizzes/:id/stats -> average score & success rate (basic)
  async quizStats(req: AuthRequest, res: Response) {
    try {
      const quizId = Number(req.params.id);
      const hasUser = !!req.user;
      const row = await sequelize.query(
        `SELECT
           COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) AS attempts_submitted,
           AVG(score_percent) AS avg_percent,
           AVG(CASE WHEN passed THEN 1 ELSE 0 END) AS pass_rate,
           ${
             hasUser
               ? "AVG(score_percent) FILTER (WHERE user_id = :userId) AS user_avg_percent"
               : "NULL AS user_avg_percent"
           }
         FROM quiz_attempts
         WHERE quiz_id = :quizId`,
        {
          type: QueryTypes.SELECT,
          replacements: { quizId, userId: hasUser ? req.user!.id : null },
        }
      );
      const data: any = row[0] || {};
      let bestAttempt: any = null;
      if (req.user) {
        const bestRows = await sequelize.query(
          `SELECT id, score_raw, score_percent, score_points, passed, submitted_at
             FROM quiz_attempts
             WHERE quiz_id = :quizId AND user_id = :userId AND submitted_at IS NOT NULL
             ORDER BY score_percent DESC NULLS LAST, submitted_at DESC
             LIMIT 1`,
          {
            type: QueryTypes.SELECT,
            replacements: { quizId, userId: req.user.id },
          }
        );
        if (bestRows.length) bestAttempt = bestRows[0];
      }
      return res.json({
        stats: {
          attempts: Number(data.attempts_submitted || 0),
          average_percent:
            data.avg_percent !== null
              ? Math.round(Number(data.avg_percent))
              : 0,
          user_average_percent:
            data.user_avg_percent !== null &&
            data.user_avg_percent !== undefined
              ? Math.round(Number(data.user_avg_percent))
              : null,
          success_rate:
            data.pass_rate !== null
              ? Math.round(Number(data.pass_rate) * 100)
              : 0,
          best_attempt: bestAttempt,
        },
      });
    } catch (e) {
      console.error("[quizzes:quizStats]", e);
      return res.status(500).json({ error: "Failed to fetch quiz stats" });
    }
  }
}

export default new QuizController();
