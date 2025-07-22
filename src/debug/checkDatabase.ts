import sequelize from "../config/database";
import User from "../models/User";

async function checkDatabaseStructure() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Check table structure
    const tableInfo = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    console.log("\nUsers table structure:");
    console.log(tableInfo[0]);

    // Check if there are any users
    const users = await User.findAll({
      limit: 3,
      include: [
        {
          model: sequelize.models.Role,
          as: "role",
          attributes: ["id", "name", "description"],
        },
      ],
    });

    console.log("\nSample users data:");
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkDatabaseStructure();
