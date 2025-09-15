/**
 * Test script to verify user deletion with foreign key constraints
 * This script creates a test user with related records and then deletes it
 */

import sequelize from "../config/database";
import User from "../models/User";
import Quiz from "../models/Quiz";
import UserService from "../services/userService";

async function testUserDeletion() {
  try {
    console.log("Starting user deletion test...");

    // Create a test user
    const testUser = await User.create({
      email: `test-user-${Date.now()}@test.com`,
      username: `testuser${Date.now()}`,
      firstname: "Test",
      lastname: "User",
      password: "testpassword",
      role_id: 1,
      level_id: 1,
      is_verified: true,
      points: 100,
    });

    console.log(`Created test user with ID: ${testUser.id}`);

    // Create a quiz owned by this user (this is what was causing the foreign key constraint error)
    const testQuiz = await Quiz.create({
      title: "Test Quiz for Deletion",
      description: "This quiz is created to test user deletion",
      duration: 30,
      passing_score: 70,
      is_active: true,
      best_practice_tag_id: 2, // Using existing "Feeding & Nutrition" tag
      created_by: testUser.id,
    });

    console.log(
      `Created test quiz with ID: ${testQuiz.id} owned by user ${testUser.id}`
    );

    // Now try to delete the user
    console.log(`Attempting to delete user ${testUser.id}...`);

    const result = await UserService.deleteUser(testUser.id);

    if (result) {
      console.log("✅ User deletion completed successfully!");

      // Verify the user is actually deleted
      const deletedUser = await User.findByPk(testUser.id);
      if (deletedUser) {
        console.log("❌ User still exists in database");
      } else {
        console.log("✅ User successfully removed from database");
      }

      // Check what happened to the quiz
      const quizAfterDeletion = await Quiz.findByPk(testQuiz.id);
      if (quizAfterDeletion) {
        console.log(
          `✅ Quiz ${testQuiz.id} still exists, reassigned to user ${quizAfterDeletion.created_by}`
        );
      } else {
        console.log(`✅ Quiz ${testQuiz.id} was deleted along with user`);
      }
    } else {
      console.log("❌ User deletion failed");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    // Clean up any remaining test data if needed
    console.log("Test completed");
  }
}

// Run the test
testUserDeletion().catch(console.error);
