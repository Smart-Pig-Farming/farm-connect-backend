/// <reference types="jest" />
import sequelize from "../config/database";
import User from "../models/User";
import UserStreak from "../models/UserStreak";
import { streakService } from "../services/scoring/StreakService";

// NOTE: This is a lightweight smoke test; assumes a test DB is configured.

describe("StreakService", () => {
  let user: any;
  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
    // Create a dummy user
    user = await User.create({
      firstname: "Test",
      lastname: "User",
      email: "streak@example.com",
      password: "x",
      username: "streak_user",
    } as any);
  });
  afterAll(async () => {
    await sequelize.close();
  });

  test("first login creates streak length 1", async () => {
    const res = await streakService.recordLogin(user.id);
    expect(res.streak.current_length).toBe(1);
    expect(res.awarded).toBeNull();
  });

  test("same day second login is idempotent", async () => {
    const again = await streakService.recordLogin(user.id);
    expect(again.alreadyCounted).toBe(true);
    expect(again.streak.current_length).toBe(1);
  });

  test("simulate next day increments", async () => {
    const streakRow = await UserStreak.findByPk(user.id);
    if (streakRow) {
      const d = new Date();
      d.setDate(d.getDate() - 1); // pretend last login was yesterday
      streakRow.last_day = d.toISOString().substring(0, 10) as any;
      await streakRow.save();
    }
    const res2 = await streakService.recordLogin(user.id);
    expect(res2.streak.current_length).toBe(2);
  });
});
