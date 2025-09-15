/**
 * Enhanced EC2 Debug Script for Quiz Visibility Issues
 * This will comprehensively check quiz system on remote server
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";
import BestPracticeTag from "../models/BestPracticeTag";
import User from "../models/User";

async function debugQuizVisibilityEC2() {
  try {
    await sequelize.authenticate();
    console.log("🔍 EC2 SERVER - Debugging quiz visibility issues...\n");

    // 1. Check database connection and basic info
    console.log("🔌 DATABASE CONNECTION INFO:");
    console.log("══════════════════════════════════════════════════");
    const [dbInfo] = await sequelize.query(
      "SELECT version(), current_database(), current_user, now();"
    );
    console.log(`PostgreSQL Version: ${(dbInfo as any)[0].version}`);
    console.log(`Database: ${(dbInfo as any)[0].current_database}`);
    console.log(`User: ${(dbInfo as any)[0].current_user}`);
    console.log(`Server Time: ${(dbInfo as any)[0].now}`);

    // 2. Check the Comprehensive Pig Farming Quiz details
    console.log("\n📋 COMPREHENSIVE QUIZ DETAILS:");
    console.log("══════════════════════════════════════════════════");
    const comprehensiveQuiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (comprehensiveQuiz) {
      console.log(`✅ Quiz Found!`);
      console.log(`Quiz ID: ${comprehensiveQuiz.id}`);
      console.log(`Title: ${comprehensiveQuiz.title}`);
      console.log(
        `Description: ${comprehensiveQuiz.description?.substring(0, 100)}...`
      );
      console.log(`Duration: ${comprehensiveQuiz.duration} minutes`);
      console.log(`Passing Score: ${comprehensiveQuiz.passing_score}%`);
      console.log(
        `Best Practice Tag ID: ${comprehensiveQuiz.best_practice_tag_id}`
      );
      console.log(`Is Active: ${comprehensiveQuiz.is_active}`);
      console.log(`Created By: ${comprehensiveQuiz.created_by}`);
      console.log(`Created At: ${comprehensiveQuiz.created_at}`);

      // Count questions and options for this quiz
      const questionCount = await QuizQuestion.count({
        where: {
          quiz_id: comprehensiveQuiz.id,
          is_active: true,
          is_deleted: false,
        },
      });

      const optionCount = await QuizQuestionOption.count({
        include: [
          {
            model: QuizQuestion,
            where: {
              quiz_id: comprehensiveQuiz.id,
              is_active: true,
              is_deleted: false,
            },
          },
        ],
      });

      console.log(`Questions: ${questionCount}`);
      console.log(`Options: ${optionCount}`);
    } else {
      console.log("❌ Comprehensive Pig Farming Quiz NOT FOUND!");

      // Let's see what quizzes do exist
      const allQuizzes = await Quiz.findAll({
        attributes: ["id", "title", "is_active", "best_practice_tag_id"],
        order: [["title", "ASC"]],
      });

      console.log(`\n📝 ALL QUIZZES IN DATABASE (${allQuizzes.length}):`);
      allQuizzes.forEach((quiz) => {
        console.log(
          `  - ID: ${quiz.id}, Title: "${quiz.title}", Active: ${quiz.is_active}, Category: ${quiz.best_practice_tag_id}`
        );
      });
    }

    // 3. Check quiz category assignment
    console.log("\n🏷️  QUIZ CATEGORY ASSIGNMENT:");
    console.log("══════════════════════════════════════════════════");
    if (comprehensiveQuiz?.best_practice_tag_id) {
      const category = await BestPracticeTag.findByPk(
        comprehensiveQuiz.best_practice_tag_id
      );
      if (category) {
        console.log(`✅ Category Found!`);
        console.log(`Category ID: ${category.id}`);
        console.log(`Category Name: ${category.name}`);
        console.log(`Category Active: ${category.is_active}`);
      } else {
        console.log(
          `❌ Category with ID ${comprehensiveQuiz.best_practice_tag_id} NOT FOUND!`
        );
      }
    }

    // 4. Check Environment Mgmt category specifically
    console.log("\n🌿 ENVIRONMENT MGMT CATEGORY:");
    console.log("══════════════════════════════════════════════════");
    const envCategory = await BestPracticeTag.findOne({
      where: { name: "Environment Mgmt" },
    });

    if (envCategory) {
      console.log(`✅ Environment Mgmt Category Found!`);
      console.log(`Environment Mgmt ID: ${envCategory.id}`);
      console.log(`Is Active: ${envCategory.is_active}`);

      // Check if there are any quizzes assigned to Environment Mgmt
      const envQuizzes = await Quiz.findAll({
        where: {
          best_practice_tag_id: envCategory.id,
          is_active: true,
        },
        attributes: ["id", "title", "created_at"],
      });

      console.log(`Quizzes assigned to Environment Mgmt: ${envQuizzes.length}`);
      envQuizzes.forEach((quiz) => {
        console.log(
          `  - ${quiz.title} (ID: ${quiz.id}) - Created: ${quiz.created_at}`
        );
      });
    } else {
      console.log("❌ Environment Mgmt category not found!");
    }

    // 5. Check all categories and their quiz counts
    console.log("\n📊 ALL CATEGORIES & QUIZ COUNTS:");
    console.log("══════════════════════════════════════════════════");
    const allCategories = await BestPracticeTag.findAll({
      order: [["name", "ASC"]],
    });

    for (const category of allCategories) {
      const quizCount = await Quiz.count({
        where: {
          best_practice_tag_id: category.id,
          is_active: true,
        },
      });

      console.log(
        `${category.name} (ID: ${category.id}): ${quizCount} quizzes (Active: ${category.is_active})`
      );
    }

    // 6. Check user who created the quiz
    console.log("\n👤 QUIZ CREATOR INFO:");
    console.log("══════════════════════════════════════════════════");
    if (comprehensiveQuiz) {
      const creator = await User.findByPk(comprehensiveQuiz.created_by);
      if (creator) {
        console.log(`✅ Creator Found!`);
        console.log(`Creator ID: ${creator.id}`);
        console.log(`Creator Email: ${creator.email}`);
        console.log(`Creator Name: ${creator.firstname} ${creator.lastname}`);
      } else {
        console.log(
          `❌ Creator with ID ${comprehensiveQuiz.created_by} NOT FOUND!`
        );
      }
    }

    // 7. Check if piggydata25@gmail.com user exists
    console.log("\n📧 TARGET USER INFO:");
    console.log("══════════════════════════════════════════════════");
    const targetUser = await User.findOne({
      where: { email: "piggydata25@gmail.com" },
    });

    if (targetUser) {
      console.log(`✅ Target User Found!`);
      console.log(`User ID: ${targetUser.id}`);
      console.log(`Email: ${targetUser.email}`);
      console.log(`Name: ${targetUser.firstname} ${targetUser.lastname}`);
      console.log(`Active: ${!targetUser.is_locked}`);
    } else {
      console.log("❌ piggydata25@gmail.com user NOT FOUND!");
    }

    // 8. Check recent quiz activity
    console.log("\n📅 RECENT QUIZ ACTIVITY:");
    console.log("══════════════════════════════════════════════════");
    const recentQuizzes = await Quiz.findAll({
      order: [["created_at", "DESC"]],
      limit: 5,
      attributes: [
        "id",
        "title",
        "best_practice_tag_id",
        "created_at",
        "is_active",
      ],
    });

    console.log("5 Most Recently Created Quizzes:");
    recentQuizzes.forEach((quiz) => {
      console.log(
        `  - ${quiz.title} (ID: ${quiz.id}, Category: ${quiz.best_practice_tag_id}, Active: ${quiz.is_active}) - ${quiz.created_at}`
      );
    });

    // 9. Raw SQL check for quiz-category relationships
    console.log("\n🔍 RAW SQL VERIFICATION:");
    console.log("══════════════════════════════════════════════════");
    const [rawCheck] = await sequelize.query(`
      SELECT 
        q.id,
        q.title,
        q.best_practice_tag_id,
        q.is_active as quiz_active,
        bpt.name as category_name,
        bpt.is_active as category_active
      FROM quizzes q
      LEFT JOIN best_practice_tags bpt ON q.best_practice_tag_id = bpt.id
      WHERE q.title ILIKE '%comprehensive%pig%farming%'
      OR q.id = (SELECT MAX(id) FROM quizzes WHERE title = 'Comprehensive Pig Farming Quiz')
      ORDER BY q.id DESC;
    `);

    if (rawCheck.length > 0) {
      console.log("Raw SQL Results for Comprehensive Quiz:");
      (rawCheck as any[]).forEach((row) => {
        console.log(`  Quiz ID: ${row.id}, Title: ${row.title}`);
        console.log(
          `  Category ID: ${row.best_practice_tag_id}, Category: ${row.category_name}`
        );
        console.log(
          `  Quiz Active: ${row.quiz_active}, Category Active: ${row.category_active}`
        );
      });
    } else {
      console.log("No results found in raw SQL check");
    }
  } catch (error) {
    console.error("❌ Error during debugging:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }
  } finally {
    await sequelize.close();
  }
}

debugQuizVisibilityEC2();
