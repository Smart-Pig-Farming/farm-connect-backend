import express from "express";
import request from "supertest";
import sequelize from "../../config/database";
import User from "../../models/User";
import Role from "../../models/Role";
import Permission from "../../models/Permission";
import RolePermission from "../../models/RolePermission";
import authService from "../../services/authService";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "../../models"; // register associations
import authRoutes from "../../routes/auth";
import quizRoutes from "../../routes/quizzes";

/**
 * Spins up an express app instance (no network listen) for Supertest.
 */
export const buildTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/quizzes", quizRoutes);
  return app;
};

/**
 * Ensure a base role and permission set exist for creating a test user.
 */
async function ensureBaseRole(): Promise<Role> {
  let role = await Role.findOne({ where: { name: "farmer" } });
  if (!role) {
    role = await Role.create({
      name: "farmer",
      description: "Test Farmer",
    } as any);
  }
  // Minimal permission to take quizzes
  const needed = ["take_quiz", "CREATE:QUIZZES", "READ:QUIZZES"];
  for (const p of needed) {
    let perm = await Permission.findOne({ where: { name: p } });
    if (!perm)
      perm = await Permission.create({ name: p, description: p } as any);
    const existing = await RolePermission.findOne({
      where: { role_id: role.id, permission_id: perm.id },
    });
    if (!existing) {
      await RolePermission.create({
        role_id: role.id,
        permission_id: perm.id,
      } as any);
    }
  }
  return role;
}

export interface AuthSession {
  user: User;
  cookies: string[]; // raw Set-Cookie values to be re-used in subsequent requests
}

/**
 * Create a user row directly & fabricate tokens using authService private methods via login route.
 * Simpler approach: create user with hashed password and call /api/auth/login.
 */
export const createAuthedSession = async (
  app: any,
  email = `tester_${Date.now()}@example.com`
): Promise<AuthSession> => {
  await sequelize.authenticate();
  await ensureBaseRole();
  // Direct create with plaintext then login to generate proper cookies
  const password = "Passw0rd!";
  const existing = await User.findOne({ where: { email } });
  let user = existing;
  if (!user) {
    user = await User.create({
      firstname: "Test",
      lastname: "User",
      email,
      username: `u_${Date.now()}`,
      password, // raw, login will bcrypt compare after registration path? (User model may hash via hook; if not, tests may need adjustment.)
      role_id: (await ensureBaseRole()).id,
      level_id: 1,
      is_verified: true,
      is_locked: false,
    } as any);
  }
  // Use login endpoint to get auth cookies
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(
      `Login failed in test helper (${loginRes.status}): ${loginRes.text}`
    );
  }
  const raw = loginRes.headers["set-cookie"];
  const setCookies: string[] = Array.isArray(raw)
    ? raw
    : raw
    ? [raw as string]
    : [];
  return { user: user!, cookies: setCookies };
};

export const closeDb = async () => {
  await sequelize.close();
};
