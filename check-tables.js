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
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("Existing tables:");
    results.forEach((row) => console.log("- " + row.table_name));

    await sequelize.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTables();
