import sequelize from "../config/database";
import User from "../models/User";

async function checkOrganizationData() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Get users with organization data
    const users = await User.findAll({
      limit: 5,
      attributes: [
        "id",
        "firstname",
        "lastname",
        "email",
        "organization",
        "sector",
        "district",
        "province",
      ],
    });

    console.log("\nUsers with organization data:");
    users.forEach((user) => {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.firstname} ${user.lastname}`);
      console.log(`Email: ${user.email}`);
      console.log(
        `Organization: ${user.organization} (Type: ${typeof user.organization})`
      );
      console.log(`Sector: ${user.sector} (Type: ${typeof user.sector})`);
      console.log(`District: ${user.district} (Type: ${typeof user.district})`);
      console.log(`Province: ${user.province} (Type: ${typeof user.province})`);
      console.log("---");
    });

    // Check raw SQL data
    const [rawResults] = await sequelize.query(`
      SELECT id, firstname, lastname, email, organization, sector, district, province
      FROM users 
      LIMIT 5;
    `);

    console.log("\nRaw database results:");
    console.log(JSON.stringify(rawResults, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkOrganizationData();
