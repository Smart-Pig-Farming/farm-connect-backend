import { runBasicSeeds } from "../seeders/basicSeeds";
import { runPermissionSeeds } from "../seeders/permissionSeeds";
import sequelize from "../config/database";
import "../models"; // Import all models to register associations

async function runSeeds() {
  try {
    console.log("Starting manual seed process...");

    // Test database connection
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Sync database models
    console.log("Syncing database models...");
    await sequelize.sync({ force: false });
    console.log("Database models synced successfully");

    // Run basic seeds
    await runBasicSeeds();

    // Run permission seeds
    await runPermissionSeeds();

    console.log("All seeds completed successfully!");

    // Show some statistics
    const Action = (await import("../models/Action")).default;
    const Resource = (await import("../models/Resource")).default;
    const Permission = (await import("../models/Permission")).default;
    const Role = (await import("../models/Role")).default;
    const User = (await import("../models/User")).default;

    const actionsCount = await Action.count();
    const resourcesCount = await Resource.count();
    const permissionsCount = await Permission.count();
    const rolesCount = await Role.count();
    const usersCount = await User.count();

    console.log("\n=== Database Statistics ===");
    console.log(`Actions: ${actionsCount}`);
    console.log(`Resources: ${resourcesCount}`);
    console.log(`Permissions: ${permissionsCount}`);
    console.log(`Roles: ${rolesCount}`);
    console.log(`Users: ${usersCount}`);

    console.log("\n=== Admin User Created ===");
    console.log("Email: piggydata25@gmail.com");
    console.log("Password: Admin123!");

    process.exit(0);
  } catch (error) {
    console.error("Error running seeds:", error);
    process.exit(1);
  }
}

runSeeds();
