import dotenv from "dotenv";
import sequelize from "../config/database";
import User from "../models/User";

// Load environment variables
dotenv.config();

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    const users = await User.findAll({
      attributes: [
        "id",
        "firstname",
        "lastname",
        "email",
        "role_id",
        "level_id",
        "points",
      ],
      order: [["id", "ASC"]],
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((user) => {
      console.log(
        `  ${user.id}: ${user.firstname} ${user.lastname} (${user.email}) - Role: ${user.role_id}, Level: ${user.level_id}, Points: ${user.points}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUsers();
