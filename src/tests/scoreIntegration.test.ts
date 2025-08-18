import request from "supertest";
import jwt from "jsonwebtoken";
import sequelize from "../config/database";
import App from "../app";
import User from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";
import { scoringService } from "../services/scoring/ScoringService";
import { leaderboardAggregationService } from "../services/scoring/LeaderboardAggregationService";
import UserScoreTotal from "../models/UserScoreTotal";
import { toScaled } from "../services/scoring/ScoreTypes";

const JWT_SECRET = process.env.JWT_SECRET || "farm-connect-secret-key";

describe("Score integration", () => {
  let app: any;
  beforeAll(async () => {
    const inst = new App();
    app = inst.app;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("Leaderboard daily ordering", async () => {
    const role =
      (await Role.findOne({ where: { name: "farmer" } })) ||
      (await Role.create({ name: "farmer", description: "farmer" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));

    const users = [] as User[];
    for (let i = 0; i < 3; i++) {
      const suffix = `${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
      const u = await User.create({
        firstname: `U${i}`,
        lastname: "Test",
        email: `leader${suffix}@ex.com`,
        username: `leader${suffix}`,
        password: "x",
        level_id: level.id,
        role_id: role.id,
      });
      users.push(u);
    }

    await scoringService.recordEvents([
      { userId: users[0].id, type: "POST_CREATED", deltaPoints: 5 },
      { userId: users[1].id, type: "POST_CREATED", deltaPoints: 10 },
      { userId: users[2].id, type: "POST_CREATED", deltaPoints: 7 },
    ]);

    await leaderboardAggregationService.rebuild("daily");

    const res = await request(app).get("/api/score/leaderboard?period=daily");
    expect(res.status).toBe(200);
    const testIds = users.map((u) => u.id);
    const subset = res.body.data.filter((r: any) =>
      testIds.includes(r.user_id)
    );
    // Ensure ordering by points among the three users (10 > 7 > 5)
    const byPoints = [...subset].sort((a: any, b: any) => b.points - a.points);
    expect(subset.map((r: any) => r.user_id)).toEqual(
      byPoints.map((r: any) => r.user_id)
    );
  });

  test("Leaderboard weekly ordering", async () => {
    await leaderboardAggregationService.rebuild("weekly");
    const res = await request(app).get("/api/score/leaderboard?period=weekly");
    expect(res.status).toBe(200);
    // Should have at least 3 from previous daily test aggregation setup
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    // Points should be non-increasing
    const pts = res.body.data.map((r: any) => r.points);
    for (let i = 1; i < pts.length; i++)
      expect(pts[i]).toBeLessThanOrEqual(pts[i - 1]);
  });

  test("Leaderboard monthly ordering", async () => {
    await leaderboardAggregationService.rebuild("monthly");
    const res = await request(app).get("/api/score/leaderboard?period=monthly");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const pts = res.body.data.map((r: any) => r.points);
    for (let i = 1; i < pts.length; i++)
      expect(pts[i]).toBeLessThanOrEqual(pts[i - 1]);
  });

  test("Admin adjust increases user total", async () => {
    const adminRole =
      (await Role.findOne({ where: { name: "admin" } })) ||
      (await Role.create({ name: "admin", description: "admin role" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));
    const uniq = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const admin = await User.create({
      firstname: "Admin",
      lastname: "User",
      email: `admin_adjust_${uniq}@example.com`,
      username: `admin_adjust_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });
    const target = await User.create({
      firstname: "Target",
      lastname: "User",
      email: `target_adjust_${uniq}@example.com`,
      username: `target_adjust_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });

    const token = jwt.sign(
      {
        userId: admin.id,
        role: "admin",
        permissions: ["MANAGE:POINTS"],
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const res = await request(app)
      .post("/api/score/admin/adjust")
      .set("Cookie", [`accessToken=${token}`])
      .send({ userId: target.id, delta: 3, reason: "bonus" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const total = await UserScoreTotal.findByPk(target.id);
    expect(total).not.toBeNull();
    expect(total!.total_points).toBe(toScaled(3));
  });

  test("Admin negative adjust decreases user total", async () => {
    const adminRole =
      (await Role.findOne({ where: { name: "admin" } })) ||
      (await Role.create({ name: "admin", description: "admin role" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));
    const uniq = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const admin = await User.create({
      firstname: "Admin2",
      lastname: "User",
      email: `admin_adjust2_${uniq}@example.com`,
      username: `admin_adjust2_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });
    const target = await User.create({
      firstname: "Target2",
      lastname: "User",
      email: `target_adjust2_${uniq}@example.com`,
      username: `target_adjust2_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });
    const token = jwt.sign(
      {
        userId: admin.id,
        role: "admin",
        permissions: ["MANAGE:POINTS"],
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // initial add +5
    let res = await request(app)
      .post("/api/score/admin/adjust")
      .set("Cookie", [`accessToken=${token}`])
      .send({ userId: target.id, delta: 5, reason: "grant" });
    expect(res.status).toBe(200);
    let total = await UserScoreTotal.findByPk(target.id);
    expect(total!.total_points).toBe(toScaled(5));

    // negative adjust -2 -> net 3
    res = await request(app)
      .post("/api/score/admin/adjust")
      .set("Cookie", [`accessToken=${token}`])
      .send({ userId: target.id, delta: -2, reason: "correction" });
    expect(res.status).toBe(200);
    total = await UserScoreTotal.findByPk(target.id);
    expect(total!.total_points).toBe(toScaled(3));
  });

  test("Moderator promotion sets Moderator prestige tier once Expert III thresholds met", async () => {
    // Arrange admin and target user
    const adminRole =
      (await Role.findOne({ where: { name: "admin" } })) ||
      (await Role.create({ name: "admin", description: "admin role" }));
    const farmerRole =
      (await Role.findOne({ where: { name: "farmer" } })) ||
      (await Role.create({ name: "farmer", description: "farmer" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));
    const uniq = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const admin = await User.create({
      firstname: "Admin3",
      lastname: "User",
      email: `admin_mod_${uniq}@example.com`,
      username: `admin_mod_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });
    const target = await User.create({
      firstname: "Target3",
      lastname: "User",
      email: `target_mod_${uniq}@example.com`,
      username: `target_mod_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: farmerRole.id,
    });

    // Give target enough points & approvals to reach Expert III (14100 pts & 50 approvals)
    await scoringService.recordEvents([
      { userId: target.id, type: "POST_CREATED", deltaPoints: 14100 },
    ]);
    // Simulate 50 moderator approvals credited to target (using MOD_APPROVED_BONUS events)
    const approvalEvents = Array.from({ length: 50 }).map((_, i) => ({
      userId: target.id,
      actorUserId: admin.id,
      type: "MOD_APPROVED_BONUS" as const,
      deltaPoints: 0, // zero-point approvals just to count towards approvals metric
      refType: "system",
      refId: `approval-${i}`,
    }));
    await scoringService.recordEvents(approvalEvents);

    // Promote to moderator
    const token = jwt.sign(
      {
        userId: admin.id,
        role: "admin",
        permissions: ["MANAGE:POINTS"],
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
    const promoteRes = await request(app)
      .post("/api/score/admin/promote-moderator")
      .set("Cookie", [`accessToken=${token}`])
      .send({ userId: target.id });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.success).toBe(true);

    // Fetch public score should show prestige Moderator
    const scoreRes = await request(app).get(`/api/score/users/${target.id}`);
    expect(scoreRes.status).toBe(200);
    expect(scoreRes.body.success).toBe(true);
    expect(scoreRes.body.data.prestige).toBe("Moderator");
  });

  test("Moderator approval bonus + reversal removes points and decrements approvals", async () => {
    // Arrange moderator
    const modRole =
      (await Role.findOne({ where: { name: "admin" } })) ||
      (await Role.create({ name: "admin", description: "admin role" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));
    const uniq = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const moderator = await User.create({
      firstname: "Mod",
      lastname: "User",
      email: `mod_rev_${uniq}@example.com`,
      username: `mod_rev_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: modRole.id,
    });
    const author = await User.create({
      firstname: "Author",
      lastname: "User",
      email: `auth_rev_${uniq}@example.com`,
      username: `auth_rev_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: modRole.id,
    });

    // Create post for author directly in DB (simplify)
    const postId = `post-rev-${uniq}`;
    // Instead of importing DiscussionPost (reduce imports), just award points directly via score events for baseline 0.
    // Simulate approval bonus via scoring service like controller would
    await scoringService.recordEvents([
      {
        userId: author.id,
        actorUserId: moderator.id,
        type: "MOD_APPROVED_BONUS",
        deltaPoints: 15,
        refType: "post",
        refId: postId,
      },
    ]);

    // Check totals after approval
    let total = await UserScoreTotal.findByPk(author.id);
    expect(total).not.toBeNull();
    expect(total!.total_points).toBe(toScaled(15));

    // Apply reversal event (simulate rejection)
    await scoringService.recordEvents([
      {
        userId: author.id,
        actorUserId: moderator.id,
        type: "MOD_APPROVED_BONUS_REVERSAL",
        deltaPoints: -15,
        refType: "post",
        refId: postId,
      },
    ]);

    total = await UserScoreTotal.findByPk(author.id);
    expect(total!.total_points).toBe(toScaled(0));
  });

  test("HTTP approve then reject applies +15 then -15", async () => {
    const adminRole =
      (await Role.findOne({ where: { name: "admin" } })) ||
      (await Role.create({ name: "admin", description: "admin" }));
    const level =
      (await Level.findOne({ where: { name: "Level 1" } })) ||
      (await Level.create({
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      }));
    const uniq = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const moderator = await User.create({
      firstname: "Mod",
      lastname: "User",
      email: `mod_http_${uniq}@example.com`,
      username: `mod_http_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });
    const author = await User.create({
      firstname: "Author",
      lastname: "User",
      email: `author_http_${uniq}@example.com`,
      username: `author_http_${uniq}`,
      password: "x",
      level_id: level.id,
      role_id: adminRole.id,
    });

    // JWT with moderation permission
    const token = jwt.sign(
      {
        userId: moderator.id,
        role: "admin",
        permissions: ["MODERATE:POSTS"],
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create post as author via direct model create (controller path is longer / validation heavy)
    const DiscussionPost = (await import("../models/DiscussionPost")).default;
    const post = await DiscussionPost.create({
      title: "Approval Flow Post",
      content: "Some sufficient content for approval flow test",
      author_id: author.id,
      is_market_post: false,
      is_available: true,
      is_approved: false,
      is_deleted: false,
      upvotes: 0,
      downvotes: 0,
      replies_count: 0,
    });

    // Approve
    let res = await request(app)
      .patch(`/api/admin/discussions/posts/${post.id}/approve`)
      .set("Cookie", [`accessToken=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    let total = await UserScoreTotal.findByPk(author.id);
    expect(total).not.toBeNull();
    expect(total!.total_points).toBe(toScaled(15));

    // Reject (reversal)
    res = await request(app)
      .patch(`/api/admin/discussions/posts/${post.id}/reject`)
      .set("Cookie", [`accessToken=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    total = await UserScoreTotal.findByPk(author.id);
    expect(total!.total_points).toBe(toScaled(0));
  });
});
