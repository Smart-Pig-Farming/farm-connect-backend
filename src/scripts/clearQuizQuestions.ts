/**
 * Script to clear all quiz questions while keeping the quizzes themselves
 * This will remove questions, options, and related attempts/answers
 * but preserve the quiz metadata (title, description, etc.)
 */

import sequelize from "../config/database";
import {
  QuizQuestion,
  QuizQuestionOption,
  QuizAttempt,
  QuizAttemptAnswer,
} from "../models";

async function clearAllQuizQuestions() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🚨 Starting quiz questions cleanup...");
    console.log("📝 This will remove all questions but keep quiz metadata");

    // Get counts before deletion for reporting
    const initialCounts = {
      attempts: await QuizAttempt.count({ transaction }),
      attemptAnswers: await QuizAttemptAnswer.count({ transaction }),
      questionOptions: await QuizQuestionOption.count({ transaction }),
      questions: await QuizQuestion.count({ transaction }),
    };

    console.log("\n📊 Current quiz question data counts:");
    console.log(`   Questions: ${initialCounts.questions}`);
    console.log(`   Question Options: ${initialCounts.questionOptions}`);
    console.log(`   Quiz Attempts: ${initialCounts.attempts}`);
    console.log(`   Attempt Answers: ${initialCounts.attemptAnswers}`);

    if (Object.values(initialCounts).every((count) => count === 0)) {
      console.log("\n✅ No quiz question data found to delete.");
      await transaction.commit();
      return;
    }

    console.log("\n🗑️  Proceeding with deletion...");

    // Delete in proper order (child records first)

    // 1. Quiz Attempt Answers (most granular)
    if (initialCounts.attemptAnswers > 0) {
      console.log("🔄 Deleting quiz attempt answers...");
      await QuizAttemptAnswer.destroy({
        where: {},
        transaction,
      });
      console.log(`✅ Deleted ${initialCounts.attemptAnswers} attempt answers`);
    }

    // 2. Quiz Attempts (since questions will be gone, attempts become meaningless)
    if (initialCounts.attempts > 0) {
      console.log("🔄 Deleting quiz attempts...");
      await QuizAttempt.destroy({
        where: {},
        transaction,
      });
      console.log(`✅ Deleted ${initialCounts.attempts} quiz attempts`);
    }

    // 3. Quiz Question Options
    if (initialCounts.questionOptions > 0) {
      console.log("🔄 Deleting quiz question options...");
      await QuizQuestionOption.destroy({
        where: {},
        transaction,
      });
      console.log(
        `✅ Deleted ${initialCounts.questionOptions} question options`
      );
    }

    // 4. Quiz Questions
    if (initialCounts.questions > 0) {
      console.log("🔄 Deleting quiz questions...");
      await QuizQuestion.destroy({
        where: {},
        transaction,
      });
      console.log(`✅ Deleted ${initialCounts.questions} quiz questions`);
    }

    // Verify cleanup
    const finalCounts = {
      attempts: await QuizAttempt.count({ transaction }),
      attemptAnswers: await QuizAttemptAnswer.count({ transaction }),
      questionOptions: await QuizQuestionOption.count({ transaction }),
      questions: await QuizQuestion.count({ transaction }),
    };

    console.log("\n📊 Final quiz question data counts:");
    console.log(`   Questions: ${finalCounts.questions}`);
    console.log(`   Question Options: ${finalCounts.questionOptions}`);
    console.log(`   Quiz Attempts: ${finalCounts.attempts}`);
    console.log(`   Attempt Answers: ${finalCounts.attemptAnswers}`);

    if (Object.values(finalCounts).every((count) => count === 0)) {
      await transaction.commit();
      console.log("\n🎉 Quiz questions cleanup completed successfully!");
      console.log(
        "   All quiz questions, options, and attempts have been removed."
      );
      console.log(
        "   Quiz metadata (titles, descriptions) has been preserved."
      );
    } else {
      throw new Error(
        "Some records were not deleted. Check for foreign key constraints or other issues."
      );
    }
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Quiz questions cleanup failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the cleanup
clearAllQuizQuestions().catch(console.error);
