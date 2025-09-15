/**
 * Script to clear all quiz-related data from the database
 * This will remove all quizzes, questions, options, attempts, and answers
 *
 * USE WITH CAUTION: This is irreversible!
 */

import sequelize from "../config/database";
import {
  Quiz,
  QuizQuestion,
  QuizQuestionOption,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizTagAssignment,
} from "../models";

async function clearAllQuizData() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🚨 Starting complete quiz data cleanup...");
    console.log("⚠️  WARNING: This will delete ALL quiz-related data!");

    // Get counts before deletion for reporting
    const initialCounts = {
      attempts: await QuizAttempt.count({ transaction }),
      attemptAnswers: await QuizAttemptAnswer.count({ transaction }),
      questionOptions: await QuizQuestionOption.count({ transaction }),
      questions: await QuizQuestion.count({ transaction }),
      tagAssignments: await QuizTagAssignment.count({ transaction }),
      quizzes: await Quiz.count({ transaction }),
    };

    console.log("\n📊 Current quiz data counts:");
    console.log(`   Quizzes: ${initialCounts.quizzes}`);
    console.log(`   Questions: ${initialCounts.questions}`);
    console.log(`   Question Options: ${initialCounts.questionOptions}`);
    console.log(`   Quiz Attempts: ${initialCounts.attempts}`);
    console.log(`   Attempt Answers: ${initialCounts.attemptAnswers}`);
    console.log(`   Tag Assignments: ${initialCounts.tagAssignments}`);

    if (Object.values(initialCounts).every((count) => count === 0)) {
      console.log("\n✅ No quiz data found to delete.");
      await transaction.commit();
      return;
    }

    console.log("\n🗑️  Proceeding with deletion...");

    // Delete in proper order (child records first to avoid foreign key issues)

    // 1. Quiz Attempt Answers (most granular)
    if (initialCounts.attemptAnswers > 0) {
      console.log("🔄 Deleting quiz attempt answers...");
      await QuizAttemptAnswer.destroy({
        where: {},
        transaction,
        truncate: true, // Faster for large datasets
      });
      console.log(`✅ Deleted ${initialCounts.attemptAnswers} attempt answers`);
    }

    // 2. Quiz Attempts
    if (initialCounts.attempts > 0) {
      console.log("🔄 Deleting quiz attempts...");
      await QuizAttempt.destroy({
        where: {},
        transaction,
        truncate: true,
      });
      console.log(`✅ Deleted ${initialCounts.attempts} quiz attempts`);
    }

    // 3. Quiz Question Options
    if (initialCounts.questionOptions > 0) {
      console.log("🔄 Deleting quiz question options...");
      await QuizQuestionOption.destroy({
        where: {},
        transaction,
        truncate: true,
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
        truncate: true,
      });
      console.log(`✅ Deleted ${initialCounts.questions} quiz questions`);
    }

    // 5. Quiz Tag Assignments
    if (initialCounts.tagAssignments > 0) {
      console.log("🔄 Deleting quiz tag assignments...");
      await QuizTagAssignment.destroy({
        where: {},
        transaction,
        truncate: true,
      });
      console.log(`✅ Deleted ${initialCounts.tagAssignments} tag assignments`);
    }

    // 6. Quizzes (parent records)
    if (initialCounts.quizzes > 0) {
      console.log("🔄 Deleting quizzes...");
      await Quiz.destroy({
        where: {},
        transaction,
        truncate: true,
      });
      console.log(`✅ Deleted ${initialCounts.quizzes} quizzes`);
    }

    // Verify cleanup
    const finalCounts = {
      attempts: await QuizAttempt.count({ transaction }),
      attemptAnswers: await QuizAttemptAnswer.count({ transaction }),
      questionOptions: await QuizQuestionOption.count({ transaction }),
      questions: await QuizQuestion.count({ transaction }),
      tagAssignments: await QuizTagAssignment.count({ transaction }),
      quizzes: await Quiz.count({ transaction }),
    };

    console.log("\n📊 Final quiz data counts:");
    console.log(`   Quizzes: ${finalCounts.quizzes}`);
    console.log(`   Questions: ${finalCounts.questions}`);
    console.log(`   Question Options: ${finalCounts.questionOptions}`);
    console.log(`   Quiz Attempts: ${finalCounts.attempts}`);
    console.log(`   Attempt Answers: ${finalCounts.attemptAnswers}`);
    console.log(`   Tag Assignments: ${finalCounts.tagAssignments}`);

    if (Object.values(finalCounts).every((count) => count === 0)) {
      await transaction.commit();
      console.log("\n🎉 Quiz cleanup completed successfully!");
      console.log(
        "   All quiz-related data has been removed from the database."
      );
    } else {
      throw new Error(
        "Some records were not deleted. Check for foreign key constraints or other issues."
      );
    }
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Quiz cleanup failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Confirmation prompt function
async function promptForConfirmation() {
  console.log("🚨 QUIZ DATA CLEANUP WARNING 🚨");
  console.log("");
  console.log(
    "This script will PERMANENTLY DELETE ALL quiz-related data including:"
  );
  console.log("• All quizzes");
  console.log("• All quiz questions and their options");
  console.log("• All user quiz attempts and answers");
  console.log("• All quiz tag assignments");
  console.log("");
  console.log("THIS ACTION CANNOT BE UNDONE!");
  console.log("");
  console.log("To proceed, uncomment the line below and run the script:");
  console.log("// clearAllQuizData().catch(console.error);");
  console.log("");
  console.log(
    "For safety, this script requires manual confirmation by editing the code."
  );
}

// Safety mechanism - require manual edit to run
promptForConfirmation();

// Uncomment the line below to actually run the cleanup:
// clearAllQuizData().catch(console.error);
