import sequelize from "../config/database";
import User from "../models/User";

async function testTimestamps() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Get users with proper timestamp access
    const users = await User.findAll({
      limit: 3,
      attributes: [
        "id",
        "firstname",
        "lastname",
        "email",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log("\nUsers with proper timestamp access:");
    users.forEach((user) => {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.firstname} ${user.lastname}`);
      console.log(`Email: ${user.email}`);
      console.log(
        `Created At: ${user.createdAt} (Type: ${typeof user.createdAt})`
      );
      console.log(
        `Updated At: ${user.updatedAt} (Type: ${typeof user.updatedAt})`
      );
      console.log(
        `Date conversion test: ${new Date(user.createdAt).toLocaleDateString()}`
      );
      console.log("---");
    });

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

testTimestamps();
