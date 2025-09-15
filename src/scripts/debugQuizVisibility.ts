/**
 * Script to debug why quizzes aren't showing up in the frontend
 * This will check the relationships between quizzes, questions, and categories
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import QuizQuestion from "../models/QuizQuestion";
import BestPracticeTag from "../models/BestPracticeTag";

async function debugQuizVisibility() {
  try {
    await sequelize.authenticate();
    console.log("🔍 Debugging quiz visibility issues...\n");

    // 1. Check the Comprehensive Pig Farming Quiz details
    console.log("📋 COMPREHENSIVE QUIZ DETAILS:");
    console.log("══════════════════════════════════════════════════");
    const comprehensiveQuiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (comprehensiveQuiz) {
      console.log(`Quiz ID: ${comprehensiveQuiz.id}`);
      console.log(`Title: ${comprehensiveQuiz.title}`);
      console.log(
        `Best Practice Tag ID: ${comprehensiveQuiz.best_practice_tag_id}`
      );
      console.log(`Is Active: ${comprehensiveQuiz.is_active}`);
      console.log(`Created By: ${comprehensiveQuiz.created_by}`);
    }

    // 2. Check what category the quiz is assigned to
    console.log("\n🏷️  QUIZ CATEGORY ASSIGNMENT:");
    console.log("══════════════════════════════════════════════════");
    if (comprehensiveQuiz?.best_practice_tag_id) {
      const category = await BestPracticeTag.findByPk(
        comprehensiveQuiz.best_practice_tag_id
      );
      if (category) {
        console.log(`Category ID: ${category.id}`);
        console.log(`Category Name: ${category.name}`);
        console.log(`Category Active: ${category.is_active}`);
      }
    }

    // 3. Check Environment Mgmt category specifically
    console.log("\n🌿 ENVIRONMENT MGMT CATEGORY:");
    console.log("══════════════════════════════════════════════════");
    const envCategory = await BestPracticeTag.findOne({
      where: { name: "Environment Mgmt" },
    });

    if (envCategory) {
      console.log(`Environment Mgmt ID: ${envCategory.id}`);
      console.log(`Is Active: ${envCategory.is_active}`);

      // Check if there are any quizzes assigned to Environment Mgmt
      const envQuizzes = await Quiz.findAll({
        where: {
          best_practice_tag_id: envCategory.id,
          is_active: true,
        },
      });

      console.log(`Quizzes assigned to Environment Mgmt: ${envQuizzes.length}`);
      envQuizzes.forEach((quiz) => {
        console.log(`  - ${quiz.title} (ID: ${quiz.id})`);
      });
    } else {
      console.log("❌ Environment Mgmt category not found!");
    }

    // 4. Check all categories and their quiz counts
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

    // 5. Check questions assigned to categories
    console.log("\n❓ QUESTIONS BY CATEGORY:");
    console.log("══════════════════════════════════════════════════");
    const questionsByCategory = await sequelize.query(
      `
      SELECT 
        bpt.name as category_name,
        bpt.id as category_id,
        COUNT(qq.id) as question_count
      FROM best_practice_tags bpt
      LEFT JOIN quiz_questions qq ON bpt.id = qq.best_practice_tag_id
      WHERE qq.is_active = true AND qq.is_deleted = false
      GROUP BY bpt.id, bpt.name
      ORDER BY question_count DESC
    `,
      {
        type: "SELECT" as any,
      }
    );

    questionsByCategory.forEach((row: any) => {
      console.log(`${row.category_name}: ${row.question_count} questions`);
    });

    // 6. Check if there are questions without category assignment
    console.log("\n⚠️  QUESTIONS WITHOUT CATEGORY:");
    console.log("══════════════════════════════════════════════════");
    const questionsWithoutCategory = await sequelize.query(
      `
      SELECT COUNT(*) as count 
      FROM quiz_questions 
      WHERE best_practice_tag_id IS NULL 
        AND is_active = true 
        AND is_deleted = false
    `,
      {
        type: "SELECT" as any,
      }
    );
    console.log(
      `Questions without category: ${
        (questionsWithoutCategory as any)[0]?.count || 0
      }`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

debugQuizVisibility();
