/**
 * Fixed Script - Removes unused category assignments from questions
 * Questions inherit category from parent quiz
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";
import User from "../models/User";
import BestPracticeTag from "../models/BestPracticeTag";

interface QuestionData {
  question: string;
  type: "single" | "multiple" | "true_false";
  options?: string[];
  correctAnswers: string[];
  explanation?: string;
}

async function populateQuizQuestions() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔍 Looking up quiz and user information...\n");

    // Dynamically find the quiz
    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (!quiz) {
      throw new Error('❌ Quiz "Comprehensive Pig Farming Quiz" not found!');
    }

    // Dynamically find the user
    const user = await User.findOne({
      where: { email: "piggydata25@gmail.com" },
    });

    if (!user) {
      throw new Error('❌ User with email "piggydata25@gmail.com" not found!');
    }

    // Get all available tags for display
    const tags = await BestPracticeTag.findAll();

    console.log(`✅ Found Quiz ID: ${quiz.id}`);
    console.log(`✅ Found User ID: ${user.id}`);
    console.log(`✅ Available tags: ${tags.map((t) => t.name).join(", ")}`);

    // Show current quiz category
    const currentCategory = await BestPracticeTag.findByPk(
      quiz.best_practice_tag_id
    );
    console.log(
      `📋 Quiz currently in category: ${currentCategory?.name} (ID: ${quiz.best_practice_tag_id})\n`
    );

    // Define all 50 questions with their data (categories removed since they're not stored at question level)
    const questionsData: QuestionData[] = [
      // SINGLE CHOICE QUESTIONS (1-25)
      {
        question: "What is the average litter size for modern commercial sows?",
        type: "single",
        options: [
          "6-8 piglets",
          "10-12 piglets",
          "14-16 piglets",
          "18-20 piglets",
        ],
        correctAnswers: ["10-12 piglets"],
      },
      {
        question:
          "Which breed is known for producing the highest quality bacon?",
        type: "single",
        options: ["Yorkshire", "Hampshire", "Landrace", "Duroc"],
        correctAnswers: ["Landrace"],
      },
      {
        question:
          "What percentage of a pig's diet should typically consist of protein for growing pigs?",
        type: "single",
        options: ["8-10%", "14-18%", "22-26%", "30-34%"],
        correctAnswers: ["14-18%"],
      },
      // Add all your other questions here without the category field...
      // I'll add a few more examples:
      {
        question: "What is the ideal temperature range for nursery pigs?",
        type: "single",
        options: ["60-65°F", "70-75°F", "80-85°F", "90-95°F"],
        correctAnswers: ["80-85°F"],
      },
      {
        question:
          "Pigs are naturally clean animals and will not soil their sleeping areas if given adequate space.",
        type: "true_false",
        correctAnswers: ["True"],
      },
      // ... rest of your 50 questions without category field
    ];

    console.log(`📝 Inserting ${questionsData.length} questions...\n`);
    console.log(
      `ℹ️  Note: All questions will inherit the quiz category: ${currentCategory?.name}\n`
    );

    let questionCount = 0;
    let optionCount = 0;

    // Process each question
    for (let i = 0; i < questionsData.length; i++) {
      const questionData = questionsData[i];

      // Map question types to the expected format
      let questionType: "mcq" | "multi" | "truefalse";
      switch (questionData.type) {
        case "single":
          questionType = "mcq";
          break;
        case "multiple":
          questionType = "multi";
          break;
        case "true_false":
          questionType = "truefalse";
          break;
        default:
          questionType = "mcq";
      }

      // Create the question (no category assignment - inherits from quiz)
      const question = await QuizQuestion.create(
        {
          quiz_id: quiz.id,
          text: questionData.question,
          type: questionType,
          order_index: i + 1,
          difficulty: "medium",
          is_active: true,
          is_deleted: false,
          explanation: questionData.explanation || null,
        },
        { transaction }
      );

      questionCount++;

      // Create options for the question
      if (questionData.type === "true_false") {
        // Create True/False options
        await QuizQuestionOption.create(
          {
            question_id: question.id,
            text: "True",
            is_correct: questionData.correctAnswers.includes("True"),
            order_index: 1,
            is_deleted: false,
          },
          { transaction }
        );

        await QuizQuestionOption.create(
          {
            question_id: question.id,
            text: "False",
            is_correct: questionData.correctAnswers.includes("False"),
            order_index: 2,
            is_deleted: false,
          },
          { transaction }
        );

        optionCount += 2;
      } else if (questionData.options) {
        // Create multiple choice options
        for (let j = 0; j < questionData.options.length; j++) {
          const optionText = questionData.options[j];
          await QuizQuestionOption.create(
            {
              question_id: question.id,
              text: optionText,
              is_correct: questionData.correctAnswers.includes(optionText),
              order_index: j + 1,
              is_deleted: false,
            },
            { transaction }
          );

          optionCount++;
        }
      }

      // Show progress
      if ((i + 1) % 10 === 0) {
        console.log(
          `✅ Processed ${i + 1}/${questionsData.length} questions...`
        );
      }
    }

    await transaction.commit();

    console.log("\n🎉 SUCCESS! Quiz population completed!");
    console.log("══════════════════════════════════════════════════");
    console.log(`✅ Quiz: ${quiz.title} (ID: ${quiz.id})`);
    console.log(
      `✅ Category: ${currentCategory?.name} (ID: ${quiz.best_practice_tag_id})`
    );
    console.log(
      `✅ Created by: ${user.firstname} ${user.lastname} (${user.email})`
    );
    console.log(`✅ Questions inserted: ${questionCount}`);
    console.log(`✅ Options created: ${optionCount}`);
    console.log("✅ All questions are active and ready for use!");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error populating quiz:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
populateQuizQuestions().catch(console.error);
