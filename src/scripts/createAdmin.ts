import User from "../models/User";
import Role from "../models/Role";
import bcrypt from "bcryptjs";
import sequelize from "../config/database";

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: "admin@farmconnect.com" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Get admin role
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    if (!adminRole) {
      console.error("Admin role not found");
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin123!", 10);

    const adminUser = await User.create({
      firstname: "System",
      lastname: "Administrator",
      email: "admin@farmconnect.com",
      username: "sysadmin",
      password: hashedPassword,
      role_id: adminRole.id,
      is_verified: true,
      is_locked: false,
      points: 0,
      level_id: 1,
    });

    console.log("Admin user created successfully");
    console.log("Credentials: admin@farmconnect.com / Admin123!");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
