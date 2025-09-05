import sequelize from "../config/database";
import User from "../models/User";

async function checkUsersData() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Get users without includes to avoid association errors
    const users = await User.findAll({
      limit: 3,
      attributes: [
        "id",
        "firstname",
        "lastname",
        "email",
        "created_at",
        "updated_at",
      ],
    });

    console.log("\nSample users data:");
    users.forEach((user) => {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.firstname} ${user.lastname}`);
      console.log(`Email: ${user.email}`);
      console.log(
        `Created At: ${user.created_at} (Type: ${typeof user.created_at})`
      );
      console.log(
        `Updated At: ${user.updated_at} (Type: ${typeof user.updated_at})`
      );
      console.log(
        `Date conversion test: ${new Date(
          user.created_at
        ).toLocaleDateString()}`
      );
      console.log("---");
    });

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkUsersData();
