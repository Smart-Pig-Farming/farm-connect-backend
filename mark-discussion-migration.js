const { Client } = require("pg");
require("dotenv").config();

async function markDiscussionMigrationAsCompleted() {
  const client = new Client(process.env.DATABASE_URL);

  try {
    await client.connect();
    console.log("Connected to database");

    const migration = "008-create-discussion-system.js";

    try {
      await client.query('INSERT INTO "SequelizeMeta" (name) VALUES ($1)', [
        migration,
      ]);
      console.log("✓ Marked as completed:", migration);
    } catch (err) {
      if (err.code === "23505") {
        console.log("→ Already exists:", migration);
      } else {
        console.error("✗ Error with:", migration, err.message);
      }
    }
  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

markDiscussionMigrationAsCompleted();
