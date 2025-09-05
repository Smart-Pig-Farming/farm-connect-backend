import { Umzug, SequelizeStorage } from "umzug";
import sequelize from "../config/database";
import path from "path";

const migrator = new Umzug({
  migrations: {
    glob: ["migrations/*.ts", { cwd: path.join(__dirname, "..") }],
    resolve: ({ name, path: filePath }: { name: string; path: string }) => {
      // Dynamic import for TypeScript files
      return {
        name,
        up: async () => {
          const migration = await import(filePath);
          return migration.up(sequelize.getQueryInterface());
        },
        down: async () => {
          const migration = await import(filePath);
          return migration.down(sequelize.getQueryInterface());
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
  logger: console,
});

export async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");

    // Get pending migrations
    const pending = await migrator.pending();
    console.log(`📋 Found ${pending.length} pending migrations`);

    if (pending.length === 0) {
      console.log("✅ Database is up to date");
      return;
    }

    // Run migrations
    const executed = await migrator.up();

    console.log("✅ Migrations completed successfully:");
    executed.forEach((migration) => {
      console.log(`  - ${migration.name}`);
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function rollbackMigration() {
  try {
    console.log("⏪ Rolling back last migration...");
    await migrator.down();
    console.log("✅ Rollback completed");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "up":
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "down":
      rollbackMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    default:
      console.log("Usage: npm run migrate [up|down]");
      process.exit(1);
  }
}
