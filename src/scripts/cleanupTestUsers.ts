/**
 * Cleanup script to remove test users and system accounts from the database
 * This should be run periodically to clean up test data
 */

import sequelize from "../config/database";
import User from "../models/User";
import { Op } from "sequelize";

async function cleanupTestUsers() {
  try {
    console.log("Starting cleanup of test users...");

    // Find test users (emails with test.com or usernames starting with testuser)
    const testUsers = await User.findAll({
      where: {
        [Op.or]: [
          {
            email: {
              [Op.iLike]: "%@test.com",
            },
          },
          {
            username: {
              [Op.iLike]: "testuser%",
            },
          },
          {
            email: "test-user-1757961017978@test.com", // Specific test user from screenshot
          },
        ],
      },
    });

    if (testUsers.length === 0) {
      console.log("No test users found to cleanup.");
      return;
    }

    console.log(`Found ${testUsers.length} test users to cleanup:`);
    testUsers.forEach((user) => {
      console.log(`- ${user.firstname} ${user.lastname} (${user.email})`);
    });

    // Delete test users (our improved deleteUser method will handle the cascade)
    const UserService = (await import("../services/userService")).default;

    for (const user of testUsers) {
      try {
        console.log(`Deleting test user: ${user.email}`);
        await UserService.deleteUser(user.id);
        console.log(`✅ Successfully deleted ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${user.email}:`, error);
      }
    }

    console.log("Test user cleanup completed!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup
cleanupTestUsers().catch(console.error);
