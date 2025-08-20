import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

describe("Reply Validation Tests", () => {
  const testUserId = 1;
  const testPostId = "test-post-id";

  const createAuthToken = () => {
    return jwt.sign(
      {
        userId: testUserId,
        role: "farmer",
        permissions: [],
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
  };

  test("should allow short replies with meaningful content", async () => {
    const token = createAuthToken();

    const response = await request(app)
      .post(`/api/discussions/posts/${testPostId}/replies`)
      .set("Cookie", [`accessToken=${token}`])
      .send({
        content: "hi",
        _csrf: "test-csrf-token",
      });

    // Should not fail with validation error about minimum length
    expect(response.status).not.toBe(400);
    // Note: This test might fail due to post not existing, but it shouldn't fail due to content length
  });

  test("should reject empty content", async () => {
    const token = createAuthToken();

    const response = await request(app)
      .post(`/api/discussions/posts/${testPostId}/replies`)
      .set("Cookie", [`accessToken=${token}`])
      .send({
        content: "",
        _csrf: "test-csrf-token",
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].msg).toContain("cannot be empty");
  });

  test("should reject whitespace-only content", async () => {
    const token = createAuthToken();

    const response = await request(app)
      .post(`/api/discussions/posts/${testPostId}/replies`)
      .set("Cookie", [`accessToken=${token}`])
      .send({
        content: "   \n\t  ",
        _csrf: "test-csrf-token",
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].msg).toContain("cannot be empty");
  });

  test("should reject content over 2000 characters", async () => {
    const token = createAuthToken();
    const longContent = "a".repeat(2001);

    const response = await request(app)
      .post(`/api/discussions/posts/${testPostId}/replies`)
      .set("Cookie", [`accessToken=${token}`])
      .send({
        content: longContent,
        _csrf: "test-csrf-token",
      });

    expect(response.status).toBe(400);
    expect(response.body.details[0].msg).toContain(
      "must not exceed 2,000 characters"
    );
  });
});
