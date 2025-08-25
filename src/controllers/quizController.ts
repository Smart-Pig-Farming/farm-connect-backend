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
      return res.status(201).json({ question: full });
    } catch (e) {
      console.error("[quizQuestions:create]", e);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  // GET /api/quizzes/:quizId/questions
  async listQuestions(req: AuthRequest, res: Response) {
    try {
      const quizId = Number(req.params.quizId);
      const { limit = 20, offset = 0 } = req.query;
      const limitNum = Math.min(100, Number(limit) || 20);
      const offsetNum = Math.max(0, Number(offset) || 0);
      const where: any = { quiz_id: quizId };
      const total = await QuizQuestion.count({ where });
      const items = await QuizQuestion.findAll({
        where,
        order: [
          ["order_index", "ASC"],
          ["id", "ASC"],
        ],
        limit: limitNum,
        offset: offsetNum,
        include: [{ model: QuizQuestionOption, as: "options" }],
      });
      const canSeeAnswers = req.user?.permissions?.some(
        (p) => p.includes("MANAGE:QUIZZES") || p.includes("UPDATE:QUIZZES")
      );
      const sanitized = items.map((q) => {
        const obj: any = q.toJSON();
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
      const { text, explanation, order_index, options } = req.body;
      const patch: any = {};
      if (text !== undefined) patch.text = String(text);
      if (explanation !== undefined)
        patch.explanation = explanation ? String(explanation) : null;
      if (order_index !== undefined) patch.order_index = Number(order_index);
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
      return res.json({ question: full });
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
      // Rate limit: max 5 active (unsubmitted) attempts per quiz per user
      const recentUnsubmitted = await QuizAttempt.count({
        where: { quiz_id: quizId, user_id: req.user.id, submitted_at: null },
      });
      if (recentUnsubmitted >= 5)
        return res.status(429).json({ error: "Too many active attempts" });
      const quiz = await Quiz.findByPk(quizId);
      if (!quiz || !quiz.is_active)
        return res.status(404).json({ error: "Quiz not found" });
      // fetch active non-deleted questions
      let questions = await QuizQuestion.findAll({
        where: { quiz_id: quizId, is_active: true, is_deleted: false },
        include: [{ model: QuizQuestionOption, as: "options" }],
        order: sequelize.random(),
        limit: Math.min(50, Number(question_count) || 10),
      });
      if (shuffle) {
        questions = questions.map((q) => {
          const obj = q.toJSON() as any;
          if (obj.options) obj.options.sort(() => Math.random() - 0.5);
          return QuizQuestion.build(obj); // temporary wrapper
        });
      }
      const attempt = await QuizAttempt.create({
        quiz_id: quizId,
        user_id: req.user.id,
        duration_seconds_snapshot: quiz.duration * 60,
        started_at: new Date(),
      });
      // sanitize answers
      const sanitizedQuestions = questions.map((q) => {
        const obj: any = q.toJSON();
        if (obj.options) obj.options.forEach((o: any) => delete o.is_correct);
        return obj;
      });
      return res.status(201).json({
        attempt: {
          id: attempt.id,
          quiz_id: quizId,
          started_at: attempt.started_at,
          expires_at: new Date(
            attempt.started_at.getTime() + quiz.duration * 60000
          ),
          duration_seconds: quiz.duration * 60,
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passing_score: quiz.passing_score,
        },
        questions: sanitizedQuestions,
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
      const answers: any[] = Array.isArray(req.body.answers)
        ? req.body.answers
        : [];
      // answers: [{question_id, option_ids: []}] support multi-select: treat correct only if exact match set
      const questionIds = answers
        .map((a) => Number(a.question_id))
        .filter(Boolean);
      const questions = await QuizQuestion.findAll({
        where: { id: questionIds },
      });
      const options = await QuizQuestionOption.findAll({
        where: { question_id: questionIds },
      });
      // Map correctness
      let correctCount = 0;
      let pointsAccum = 0; // partial points
      const totalCount = questions.length;
      for (const a of answers) {
        const qOpts = options.filter(
          (o) => o.question_id === Number(a.question_id)
        );
        const correctOpts = qOpts
          .filter((o) => o.is_correct)
          .map((o) => o.id)
          .sort();
        const chosen = (Array.isArray(a.option_ids) ? a.option_ids : [])
          .map(Number)
          .sort();
        const intersection = chosen.filter((id: number) =>
          correctOpts.includes(id)
        );
        const wrongChosen = chosen.filter(
          (id: number) => !correctOpts.includes(id)
        );
        const baseAllMatch =
          correctOpts.length === chosen.length &&
          correctOpts.every((id, idx) => id === chosen[idx]);
        if (baseAllMatch) {
          correctCount++;
          pointsAccum += 1;
        } else {
          // Partial scoring: award fraction = (# correct picked / total correct) - penalty*(wrong picks)
          if (correctOpts.length) {
            const fraction = intersection.length / correctOpts.length;
            const penalty = wrongChosen.length
              ? wrongChosen.length * (1 / correctOpts.length)
              : 0;
            const partial = Math.max(0, fraction - penalty);
            if (partial > 0) pointsAccum += partial;
          }
        }
        // record each chosen option
        for (const optId of chosen) {
          const opt = qOpts.find((o) => o.id === optId);
          if (!opt) continue;
          await QuizAttemptAnswer.create({
            attempt_id: attempt.id,
            question_id: Number(a.question_id),
            option_id: optId,
            is_correct_snapshot: !!opt.is_correct,
          });
        }
      }
      const scorePercent = totalCount
        ? Math.round((pointsAccum / totalCount) * 100)
        : 0;
      const passed = scorePercent >= quiz.passing_score;
      await attempt.update({
        submitted_at: now,
        score_raw: correctCount,
        score_percent: scorePercent,
        score_points: pointsAccum.toFixed(3),
        passed,
      });
      return res.json({
        attempt: {
          id: attempt.id,
          quiz_id: quizId,
          score_raw: correctCount,
          score_percent: scorePercent,
          score_points: pointsAccum,
          passed,
          submitted_at: now,
          time_exceeded: timeExceeded,
        },
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
      const attempt = await QuizAttempt.findByPk(Number(attemptId), {
        include: [
          {
            model: QuizAttemptAnswer,
            as: "answers",
            include: [
              { model: QuizQuestionOption, as: "option" },
              { model: QuizQuestion, as: "question" },
            ],
          },
        ],
      });
      if (
        !attempt ||
        attempt.quiz_id !== Number(id) ||
        attempt.user_id !== req.user.id
      )
        return res.status(404).json({ error: "Attempt not found" });
      return res.json({ attempt });
    } catch (e) {
      console.error("[quizAttempts:get]", e);
      return res.status(500).json({ error: "Failed to fetch attempt" });
    }
  }

  // GET /api/quizzes/:id/stats -> average score & success rate (basic)
  async quizStats(req: AuthRequest, res: Response) {
    try {
      const quizId = Number(req.params.id);
      const row = await sequelize.query(
        `SELECT
           COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as attempts_submitted,
           AVG(score_percent) as avg_percent,
           AVG(CASE WHEN passed THEN 1 ELSE 0 END) as pass_rate
         FROM quiz_attempts WHERE quiz_id = :quizId`,
        { type: QueryTypes.SELECT, replacements: { quizId } }
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
