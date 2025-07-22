import sequelize from "../config/database";
import Role from "../models/Role";

async function checkRoles() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    const roles = await Role.findAll({
      attributes: ["id", "name", "description"],
      order: [["id", "ASC"]],
    });

    console.log("\nRoles in database:");
    roles.forEach((role) => {
      console.log(
        `ID: ${role.id}, Name: ${role.name}, Description: ${role.description}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkRoles();
