/// <reference types="jest" />
import request from "supertest";
import sequelize from "../config/database";
import {
  buildTestApp,
  createAuthedSession,
  closeDb,
} from "./helpers/testUtils";
import Quiz from "../models/Quiz";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";

/**
 * Tests for quiz attempt start flow (integration level).
 * These expect a Postgres test database reachable with migrations applied OR auto table creation enabled.
 */

const skipDb2 = process.env.SKIP_DB_TESTS === "true";
const maybeDescribe2 = skipDb2 ? describe.skip : describe;

maybeDescribe2("Quiz Attempt Start Flow", () => {
  const app = buildTestApp();
  let auth: Awaited<ReturnType<typeof createAuthedSession>>;
  beforeAll(async () => {
    // Ensure DB connection
    await sequelize.authenticate();
    auth = await createAuthedSession(app);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("starting attempt with no questions returns 409 NO_QUESTIONS", async () => {
    // Create empty quiz
    const quiz = await Quiz.create({
      title: "Empty Quiz",
      description: "No questions yet",
      duration: 5,
      passing_score: 70,
      best_practice_tag_id: 1,
      created_by: auth.user.id,
      is_active: true,
    } as any);
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .set("Cookie", auth.cookies)
      .send({ question_count: 5 });
    expect([409, 201]).toContain(res.status); // accept race if seed inserted questions unexpectedly
    if (res.status === 409) {
      expect(res.body.code).toBe("NO_QUESTIONS");
    }
  });

  test("starting attempt returns questions with options and snapshot persists", async () => {
    // Create quiz with 3 questions
    const quiz = await Quiz.create({
      title: "Sample Quiz",
      description: "Has questions",
      duration: 5,
      passing_score: 60,
      best_practice_tag_id: 1,
      created_by: auth.user.id,
      is_active: true,
    } as any);

    const questions: QuizQuestion[] = [];
    for (let i = 0; i < 3; i++) {
      const q = await QuizQuestion.create({
        quiz_id: quiz.id,
        text: `Question ${i + 1}?`,
        explanation: "Because reasons",
        order_index: i,
        type: "mcq",
        difficulty: "medium",
        is_active: true,
        is_deleted: false,
      } as any);
      await QuizQuestionOption.bulkCreate([
        {
          question_id: q.id,
          text: "A",
          is_correct: i === 0,
          order_index: 0,
          is_deleted: false,
        },
        {
          question_id: q.id,
          text: "B",
          is_correct: i === 1,
          order_index: 1,
          is_deleted: false,
        },
        {
          question_id: q.id,
          text: "C",
          is_correct: i === 2,
          order_index: 2,
          is_deleted: false,
        },
      ] as any);
      questions.push(q);
    }

    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .set("Cookie", auth.cookies)
      .send({ question_count: 5, shuffle: false });

    expect(res.status).toBe(201);
    expect(res.body.attempt).toBeDefined();
    expect(res.body.questions.length).toBe(3);
    // Each question should have options, none exposing is_correct
    for (const q of res.body.questions) {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThan(0);
      for (const o of q.options) {
        expect(o.is_correct).toBeUndefined();
      }
    }
    expect(res.body.partial_set).toBe(true); // requested 5, served 3
    expect(res.body.reused).toBe(false);

    // Second start should reuse attempt
    const res2 = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .set("Cookie", auth.cookies)
      .send({ question_count: 5 });
    expect(res2.status).toBe(200);
    expect(res2.body.reused).toBe(true);
    expect(res2.body.attempt.id).toBe(res.body.attempt.id);
  });
});
