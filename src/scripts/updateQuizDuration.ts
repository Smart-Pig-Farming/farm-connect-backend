/**
 * Script to update the Comprehensive Pig Farming Quiz duration from 60 minutes to 10 minutes
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";

async function updateQuizDuration() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔧 Updating quiz duration...\n");

    // Find the quiz
    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (!quiz) {
      throw new Error('❌ Quiz "Comprehensive Pig Farming Quiz" not found!');
    }

    console.log("📋 BEFORE UPDATE:");
    console.log("══════════════════════════════════════════════════");
    console.log(`Title: ${quiz.title}`);
    console.log(`Duration: ${quiz.duration} minutes`);
    console.log(`Passing Score: ${quiz.passing_score}%`);

    // Update the duration
    await quiz.update(
      {
        duration: 10,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch updated quiz to confirm
    await quiz.reload();

    console.log("\n📋 AFTER UPDATE:");
    console.log("══════════════════════════════════════════════════");
    console.log(`Title: ${quiz.title}`);
    console.log(`Duration: ${quiz.duration} minutes`);
    console.log(`Passing Score: ${quiz.passing_score}%`);

    console.log(
      "\n✅ SUCCESS! Quiz duration updated from 60 minutes to 10 minutes"
    );
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error updating quiz duration:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
updateQuizDuration().catch(console.error);
