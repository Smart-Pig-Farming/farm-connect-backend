import sequelize from "../config/database";

async function checkRawUserData() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Raw SQL query to check the actual data
    const [results] = await sequelize.query(`
      SELECT id, firstname, lastname, email, created_at, updated_at 
      FROM users 
      LIMIT 3;
    `);

    console.log("\nRaw database results:");
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkRawUserData();
