import { streakService } from "../services/scoring/StreakService";
import UserStreak from "../models/UserStreak";
import sequelize from "../config/database";
import Role from "../models/Role";
import Level from "../models/Level";
import User from "../models/User";

// Minimal in-memory style test (assumes test DB configured)

describe("StreakService.recordLogin", () => {
  const userId = 999999; // test user id

  beforeAll(async () => {
    // Ensure prerequisite FK rows exist
    const [role] = await Role.findOrCreate({
      where: { name: "tester" },
      defaults: { name: "tester", description: "test role" },
    });
    const [level] = await Level.findOrCreate({
      where: { name: "Level 1" },
      defaults: {
        name: "Level 1",
        description: "level",
        min_points: 0,
        max_points: 1000,
      },
    });
    await User.destroy({ where: { id: userId } });
    await User.create({
      id: userId,
      firstname: "T",
      lastname: "User",
      email: `tuser${userId}@example.com`,
      username: `tuser${userId}`,
      password: "hashed",
      level_id: level.id,
      role_id: role.id,
    });
    await UserStreak.destroy({ where: { user_id: userId } });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("starts new streak at 1", async () => {
    const { streak } = await streakService.recordLogin(userId);
    expect(streak.current_length).toBeGreaterThanOrEqual(1);
  });

  it("does not double count same day", async () => {
    const before = await UserStreak.findByPk(userId);
    const { streak } = await streakService.recordLogin(userId);
    expect(streak.current_length).toBe(before?.current_length);
  });
});
