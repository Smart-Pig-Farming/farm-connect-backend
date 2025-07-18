import sequelize from "../config/database";
import authService from "../services/authService";

async function testUserCreation() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Test farmer registration with organization
    const testFarmerData = {
      firstname: "Test",
      lastname: "Farmer",
      email: "test.farmer@example.com",
      password: "testpassword123",
      farmName: "Test Farm Organization",
      province: "Kigali",
      district: "Gasabo",
      sector: "Kinyinya",
      field: "Pig farming",
    };

    console.log("\nTesting farmer registration...");
    const result = await authService.registerFarmer(testFarmerData);
    console.log("Registration successful:", result.user);

    // Check if user was created with organization
    const User = (await import("../models/User")).default;
    const createdUser = await User.findOne({
      where: { email: testFarmerData.email },
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

    console.log("\nUser data from database:");
    console.log(JSON.stringify(createdUser, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

testUserCreation();
