import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function verifyEnvironment() {
  console.log("🔍 ENVIRONMENT VERIFICATION");
  console.log("══════════════════════════════════════════════════");

  // Check Node.js version
  console.log(`📦 Node.js Version: ${process.version}`);
  console.log(`📂 Current Directory: ${process.cwd()}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || "not set"}`);

  // Check environment variables
  console.log("\n📋 DATABASE CONFIGURATION:");
  console.log(`DB_HOST: ${process.env.DB_HOST || "not set"}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || "not set"}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || "not set"}`);
  console.log(`DB_USER: ${process.env.DB_USER || "not set"}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? "[SET]" : "not set"}`);

  // Test database connection
  console.log("\n🔌 TESTING DATABASE CONNECTION...");

  const sequelize = new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD!,
    {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || "5432"),
      dialect: "postgres",
      logging: false,
    }
  );

  try {
    await sequelize.authenticate();
    console.log("✅ Database connection successful!");

    // Test basic queries
    console.log("\n🧪 TESTING BASIC QUERIES...");

    const [results] = await sequelize.query("SELECT version();");
    console.log(`✅ PostgreSQL Version: ${(results as any)[0].version}`);

    const [tableCheck] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'quizzes', 'quiz_questions', 'best_practice_tags')
      ORDER BY table_name;
    `);

    console.log("\n📊 REQUIRED TABLES STATUS:");
    const requiredTables = [
      "users",
      "quizzes",
      "quiz_questions",
      "best_practice_tags",
    ];
    const existingTables = (tableCheck as any[]).map((row) => row.table_name);

    requiredTables.forEach((table) => {
      const exists = existingTables.includes(table);
      console.log(
        `${exists ? "✅" : "❌"} ${table}: ${exists ? "EXISTS" : "MISSING"}`
      );
    });

    // Check quiz_questions table structure
    console.log("\n🔍 QUIZ_QUESTIONS TABLE STRUCTURE:");
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'quiz_questions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    (columns as any[]).forEach((col) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

verifyEnvironment().catch(console.error);
