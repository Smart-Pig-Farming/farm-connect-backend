import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import User from "../models/User";
import BestPracticeTag from "../models/BestPracticeTag";

async function getIds() {
  try {
    await sequelize.authenticate();
    console.log("🔍 Looking for quiz and user information...\n");

    // Find the Comprehensive Pig Farming Quiz
    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    // Find the user
    const user = await User.findOne({
      where: { email: "piggydata25@gmail.com" },
    });

    console.log("📋 QUIZ INFORMATION:");
    console.log("══════════════════════════════════════════════════");
    if (quiz) {
      console.log(`Quiz ID: ${quiz.id}`);
      console.log(`Title: ${quiz.title}`);
      console.log(`Description: ${quiz.description}`);
      console.log(`Duration: ${quiz.duration} minutes`);
      console.log(`Passing Score: ${quiz.passing_score}%`);
      console.log(`Best Practice Tag ID: ${quiz.best_practice_tag_id}`);
      console.log(`Created By: ${quiz.created_by}`);
    } else {
      console.log("❌ Quiz not found!");
    }

    console.log("\n👤 USER INFORMATION:");
    console.log("══════════════════════════════════════════════════");
    if (user) {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.firstname} ${user.lastname}`);
      console.log(`Email: ${user.email}`);
    } else {
      console.log("❌ User not found!");
    }

    // Get all available tags
    console.log("\n🏷️  AVAILABLE BEST PRACTICE TAGS:");
    console.log("══════════════════════════════════════════════════");
    const tags = await BestPracticeTag.findAll({ order: [["name", "ASC"]] });
    tags.forEach((tag) => {
      console.log(`ID: ${tag.id} - ${tag.name}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

getIds();
