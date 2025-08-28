import request from "supertest";
import app from "../app";
import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Helper to create auth user + token
async function createUser() {
  const password = await bcrypt.hash("Passw0rd!", 10);
  const user = await User.create({
    name: "Tester",
    email: `tester_${Date.now()}@example.com`,
    password_hash: password,
    role: "admin",
  } as any);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev", {
    expiresIn: "1h",
  });
  return { user, token };
}

describe("Quiz Question validation", () => {
  let quiz: any;
  let token: string;
  beforeAll(async () => {
    await sequelize.sync();
    ({ token } = await createUser());
    quiz = await Quiz.create({
      title: "Validation Quiz",
      description: "Test",
      passing_score: 70,
      duration: 5,
      is_active: true,
    } as any);
  });

  test("MCQ must have exactly one correct", async () => {
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Pick one",
        type: "mcq",
        options: [
          { text: "A", is_correct: true },
          { text: "B", is_correct: true },
        ],
      });
    expect(res.status).toBe(400);
  });

  test("Multi needs at least two correct", async () => {
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Pick many",
        type: "multi",
        options: [
          { text: "A", is_correct: true },
          { text: "B", is_correct: false },
          { text: "C", is_correct: false },
        ],
      });
    expect(res.status).toBe(400);
  });

  test("Valid multi passes", async () => {
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Valid multi",
        type: "multi",
        options: [
          { text: "A", is_correct: true },
          { text: "B", is_correct: true },
          { text: "C", is_correct: false },
        ],
      });
    expect(res.status).toBe(201);
  });
});
