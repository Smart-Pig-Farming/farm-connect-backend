/**
 * Script to inspect current quiz data in the database
 * Shows counts and sample records to help decide what to clean up
 */

import sequelize from "../config/database";
import { QueryTypes } from "sequelize";
import {
  Quiz,
  QuizQuestion,
  QuizQuestionOption,
  QuizAttempt,
  QuizAttemptAnswer,
  QuizTagAssignment,
  User,
  BestPracticeTag,
} from "../models";

async function inspectQuizData() {
  try {
    console.log("🔍 Inspecting quiz data in the database...\n");

    // Get counts
    const counts = {
      quizzes: await Quiz.count(),
      questions: await QuizQuestion.count(),
      questionOptions: await QuizQuestionOption.count(),
      attempts: await QuizAttempt.count(),
      attemptAnswers: await QuizAttemptAnswer.count(),
      tagAssignments: await QuizTagAssignment.count(),
    };

    console.log("📊 QUIZ DATA SUMMARY:");
    console.log("═".repeat(50));
    console.log(`Total Quizzes: ${counts.quizzes}`);
    console.log(`Total Questions: ${counts.questions}`);
    console.log(`Total Question Options: ${counts.questionOptions}`);
    console.log(`Total Quiz Attempts: ${counts.attempts}`);
    console.log(`Total Attempt Answers: ${counts.attemptAnswers}`);
    console.log(`Total Tag Assignments: ${counts.tagAssignments}`);
    console.log();

    // Show sample quizzes if any exist
    if (counts.quizzes > 0) {
      console.log("📋 SAMPLE QUIZZES:");
      console.log("─".repeat(50));

      const sampleQuizzes = await Quiz.findAll({
        limit: 5,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstname", "lastname", "email"],
          },
          {
            model: BestPracticeTag,
            as: "bestPracticeTag",
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      sampleQuizzes.forEach((quiz, index) => {
        console.log(`${index + 1}. "${quiz.title}" (ID: ${quiz.id})`);
        console.log(
          `   Description: ${quiz.description.substring(0, 100)}${
            quiz.description.length > 100 ? "..." : ""
          }`
        );
        console.log(`   Duration: ${quiz.duration} minutes`);
        console.log(`   Passing Score: ${quiz.passing_score}%`);
        console.log(`   Active: ${quiz.is_active ? "Yes" : "No"}`);
        console.log(
          `   Created by: ${(quiz as any).creator?.firstname} ${
            (quiz as any).creator?.lastname
          } (${(quiz as any).creator?.email})`
        );
        console.log(
          `   Category: ${(quiz as any).bestPracticeTag?.name || "Unknown"}`
        );
        console.log(`   Created: ${quiz.created_at?.toLocaleDateString()}`);
        console.log();
      });

      // Show questions breakdown by quiz
      console.log("❓ QUESTIONS BREAKDOWN BY QUIZ:");
      console.log("─".repeat(50));

      const questionStats = await sequelize.query(
        `
        SELECT 
          q.id,
          q.title,
          COUNT(qq.id) as question_count,
          COUNT(CASE WHEN qq.is_active = true THEN 1 END) as active_questions,
          COUNT(CASE WHEN qq.is_deleted = true THEN 1 END) as deleted_questions
        FROM quizzes q
        LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
        GROUP BY q.id, q.title
        ORDER BY question_count DESC
        LIMIT 10
      `,
        { type: QueryTypes.SELECT }
      );

      (questionStats as any[]).forEach((stat) => {
        console.log(`Quiz "${stat.title}" (ID: ${stat.id})`);
        console.log(`  Total Questions: ${stat.question_count}`);
        console.log(`  Active Questions: ${stat.active_questions}`);
        console.log(`  Deleted Questions: ${stat.deleted_questions}`);
        console.log();
      });
    }

    // Show attempt statistics if any exist
    if (counts.attempts > 0) {
      console.log("📈 QUIZ ATTEMPT STATISTICS:");
      console.log("─".repeat(50));

      const attemptStats = await sequelize.query(
        `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(score_percent) as avg_score
        FROM quiz_attempts
        GROUP BY status
        ORDER BY count DESC
      `,
        { type: QueryTypes.SELECT }
      );

      (attemptStats as any[]).forEach((stat) => {
        console.log(
          `${stat.status}: ${stat.count} attempts (Avg Score: ${
            stat.avg_score
              ? Math.round(stat.avg_score * 100) / 100 + "%"
              : "N/A"
          })`
        );
      });
      console.log();

      // Recent attempts
      const recentAttempts = await QuizAttempt.findAll({
        limit: 5,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["firstname", "lastname", "email"],
          },
          {
            model: Quiz,
            as: "quiz",
            attributes: ["title"],
          },
        ],
        order: [["started_at", "DESC"]],
      });

      if (recentAttempts.length > 0) {
        console.log("🕐 RECENT QUIZ ATTEMPTS:");
        console.log("─".repeat(50));

        recentAttempts.forEach((attempt, index) => {
          console.log(
            `${index + 1}. ${(attempt as any).user?.firstname} ${
              (attempt as any).user?.lastname
            } - "${(attempt as any).quiz?.title}"`
          );
          console.log(
            `   Status: ${attempt.status} | Score: ${
              attempt.score_percent || "N/A"
            }% | Started: ${attempt.started_at?.toLocaleString()}`
          );
          console.log();
        });
      }
    }

    console.log("🛠️  AVAILABLE CLEANUP SCRIPTS:");
    console.log("─".repeat(50));
    console.log(
      "1. clearQuizQuestions.ts - Removes all questions but keeps quiz metadata"
    );
    console.log(
      "2. clearAllQuizData.ts - Removes everything quiz-related (requires manual confirmation)"
    );
    console.log();
  } catch (error) {
    console.error("❌ Error inspecting quiz data:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the inspection
inspectQuizData().catch(console.error);
