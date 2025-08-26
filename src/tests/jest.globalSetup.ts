// Jest global setup: ensure NODE_ENV=test so test DB is used
export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = "test";
  // Provide default test DB credentials if not set (adjust if you have a real test DB)
  process.env.DB_HOST = process.env.DB_HOST || "localhost";
  process.env.DB_PORT = process.env.DB_PORT || "5432";
  process.env.DB_NAME_TEST = process.env.DB_NAME_TEST || "farm_connect_test";
  process.env.DB_USERNAME = process.env.DB_USERNAME || "username";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || "password";
  // Lightweight probe to see if test DB is reachable; if not, set skip flag so tests are gracefully skipped
  try {
    const { Client } = require("pg");
    const client = new Client({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME_TEST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    await client.connect();
    await client.end();
    process.env.SKIP_DB_TESTS = "false";
  } catch {
    process.env.SKIP_DB_TESTS = "true";
    console.warn(
      "[jest.globalSetup] Test DB not reachable; DB-dependent tests will be skipped."
    );
  }
}
