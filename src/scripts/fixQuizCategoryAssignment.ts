/**
 * Script to fix quiz category assignment issue
 * The Comprehensive quiz is in "Pig Farming" but frontend expects "Environment Mgmt"
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import BestPracticeTag from "../models/BestPracticeTag";

async function fixQuizCategoryAssignment() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔧 Fixing quiz category assignment...\n");

    // Get Environment Mgmt category
    const envCategory = await BestPracticeTag.findOne({
      where: { name: "Environment Mgmt" },
    });

    if (!envCategory) {
      throw new Error("Environment Mgmt category not found!");
    }

    // Get Comprehensive quiz
    const comprehensiveQuiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (!comprehensiveQuiz) {
      throw new Error("Comprehensive Pig Farming Quiz not found!");
    }

    console.log("📋 CURRENT STATE:");
    console.log("══════════════════════════════════════════════════");
    console.log(`Environment Mgmt Category ID: ${envCategory.id}`);
    console.log(`Comprehensive Quiz ID: ${comprehensiveQuiz.id}`);
    console.log(
      `Quiz Current Category ID: ${comprehensiveQuiz.best_practice_tag_id}`
    );

    // Option 1: Move Comprehensive quiz to Environment Mgmt category
    console.log("\n🔄 OPTION 1: Move Comprehensive quiz to Environment Mgmt");
    console.log(
      "This will make the comprehensive quiz show up in Environment Mgmt section"
    );

    // Option 2: Check what quizzes are currently in Environment Mgmt
    const envQuizzes = await Quiz.findAll({
      where: {
        best_practice_tag_id: envCategory.id,
        is_active: true,
      },
    });

    console.log("\n📊 CURRENT ENVIRONMENT MGMT QUIZZES:");
    console.log("══════════════════════════════════════════════════");
    for (const quiz of envQuizzes) {
      // Count questions for each quiz
      const questionCount = await sequelize.query(
        "SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_id = ? AND is_active = true AND is_deleted = false",
        {
          replacements: [quiz.id],
          type: "SELECT" as any,
        }
      );

      const count = (questionCount as any)[0]?.count || 0;
      console.log(`- ${quiz.title} (ID: ${quiz.id}): ${count} questions`);
    }

    console.log("\n🎯 RECOMMENDED SOLUTIONS:");
    console.log("══════════════════════════════════════════════════");
    console.log("1. Move Comprehensive quiz to Environment Mgmt category");
    console.log(
      "2. OR: Populate the existing Environment Mgmt quizzes with questions"
    );
    console.log("3. OR: Create a new quiz specifically for Environment Mgmt");

    // Let's automatically fix by moving the comprehensive quiz to Environment Mgmt
    console.log(
      "\n🔧 APPLYING FIX: Moving Comprehensive quiz to Environment Mgmt..."
    );

    await comprehensiveQuiz.update(
      {
        best_practice_tag_id: envCategory.id,
      },
      { transaction }
    );

    await transaction.commit();

    console.log(
      "✅ SUCCESS! Comprehensive Pig Farming Quiz moved to Environment Mgmt category"
    );
    console.log(
      "The quiz should now appear in the Environment Mgmt section of your frontend"
    );
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fixQuizCategoryAssignment();
