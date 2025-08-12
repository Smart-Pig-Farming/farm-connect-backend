const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "farm_connect_db",
  process.env.DB_USERNAME || "postgres",
  process.env.DB_PASSWORD || "cmua",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

async function checkTables() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'post_tags'
      ORDER BY ordinal_position;
    `);

    console.log("post_tags table structure:");
    results.forEach((row) => {
      console.log(
        `- ${row.column_name} (${row.data_type}) ${
          row.is_nullable === "YES" ? "NULL" : "NOT NULL"
        }`
      );
    });

    await sequelize.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTables();
