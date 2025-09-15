/**
 * Enhanced script to populate category-specific pig farming quizzes
 * Creates separate quizzes for each best practice category
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
  category: string;
  explanation?: string;
}

async function populateCategorySpecificQuizzes() {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔍 Setting up category-specific pig farming quizzes...\n");

    // Find the user
    const user = await User.findOne({
      where: { email: "piggydata25@gmail.com" },
    });

    if (!user) {
      throw new Error('❌ User with email "piggydata25@gmail.com" not found!');
    }

    // Get all available tags
    const tags = await BestPracticeTag.findAll();
    const tagMap = new Map(tags.map((tag) => [tag.name, tag]));

    console.log(`✅ Found User ID: ${user.id}`);
    console.log(
      `✅ Available categories: ${tags.map((t) => t.name).join(", ")}\n`
    );

    // Define the same 50 questions that will be used for ALL categories
    const baseQuestionsData: QuestionData[] = [
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
        category: "", // Will be set dynamically
        explanation:
          "Modern commercial sows typically produce 10-12 piglets per litter with proper management.",
      },
      {
        question:
          "Which breed is known for producing the highest quality bacon?",
        type: "single",
        options: ["Yorkshire", "Hampshire", "Landrace", "Duroc"],
        correctAnswers: ["Landrace"],
        category: "Breeding & Insemination",
        explanation:
          "Landrace pigs are specifically bred for bacon production with their long, lean bodies.",
      },
      {
        question: "What is the ideal breeding age for gilts?",
        type: "single",
        options: ["4-5 months", "6-8 months", "10-12 months", "14-16 months"],
        correctAnswers: ["6-8 months"],
        category: "Breeding & Insemination",
        explanation:
          "Gilts should be bred at 6-8 months when they reach 250-300 pounds for optimal reproductive performance.",
      },
      {
        question: "How long is the gestation period for pigs?",
        type: "single",
        options: ["110 days", "114 days", "120 days", "125 days"],
        correctAnswers: ["114 days"],
        category: "Breeding & Insemination",
        explanation:
          "Pig gestation is approximately 3 months, 3 weeks, and 3 days (114 days).",
      },

      // FEEDING & NUTRITION QUESTIONS
      {
        question:
          "What percentage of a pig's diet should typically consist of protein for growing pigs?",
        type: "single",
        options: ["8-10%", "14-18%", "22-26%", "30-34%"],
        correctAnswers: ["14-18%"],
        category: "Feeding & Nutrition",
        explanation:
          "Growing pigs require 14-18% protein for optimal growth and muscle development.",
      },
      {
        question: "Which grain is the primary energy source in most pig diets?",
        type: "single",
        options: ["Wheat", "Corn", "Barley", "Oats"],
        correctAnswers: ["Corn"],
        category: "Feeding & Nutrition",
        explanation:
          "Corn provides the highest energy content and is most cost-effective for pig diets.",
      },
      {
        question: "What is the recommended daily water intake for a 100kg pig?",
        type: "single",
        options: ["5-8 liters", "12-15 liters", "18-25 liters", "30-35 liters"],
        correctAnswers: ["12-15 liters"],
        category: "Feeding & Nutrition",
        explanation:
          "A 100kg pig needs approximately 12-15 liters of clean water daily for proper hydration and digestion.",
      },
      {
        question: "Which vitamin deficiency causes night blindness in pigs?",
        type: "single",
        options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin E"],
        correctAnswers: ["Vitamin A"],
        category: "Feeding & Nutrition",
        explanation:
          "Vitamin A deficiency leads to night blindness and poor reproductive performance in pigs.",
      },

      // DISEASE CONTROL QUESTIONS
      {
        question:
          "What is the most effective method for preventing African Swine Fever?",
        type: "single",
        options: [
          "Vaccination",
          "Biosecurity measures",
          "Antibiotics",
          "Vitamin supplements",
        ],
        correctAnswers: ["Biosecurity measures"],
        category: "Disease Control",
        explanation:
          "Since no vaccine exists for ASF, strict biosecurity is the only effective prevention method.",
      },
      {
        question:
          "Which disease is characterized by diamond-shaped skin lesions?",
        type: "single",
        options: ["Swine flu", "Erysipelas", "PRRS", "Foot and mouth disease"],
        correctAnswers: ["Erysipelas"],
        category: "Disease Control",
        explanation:
          "Erysipelas causes characteristic diamond-shaped red skin lesions in affected pigs.",
      },
      {
        question: "What is the quarantine period for new pigs entering a farm?",
        type: "single",
        options: ["7 days", "14 days", "21-30 days", "45 days"],
        correctAnswers: ["21-30 days"],
        category: "Disease Control",
        explanation:
          "A 21-30 day quarantine allows time for disease incubation and proper health assessment.",
      },
      {
        question: "Which internal parasite commonly affects pig intestines?",
        type: "single",
        options: ["Lungworms", "Roundworms", "Mange mites", "Lice"],
        correctAnswers: ["Roundworms"],
        category: "Disease Control",
        explanation:
          "Roundworms (Ascaris suum) are the most common internal parasites in pig intestines.",
      },

      // ENVIRONMENT MGMT QUESTIONS
      {
        question: "What is the optimal temperature range for nursery pigs?",
        type: "single",
        options: ["18-20°C", "22-26°C", "28-32°C", "34-38°C"],
        correctAnswers: ["28-32°C"],
        category: "Environment Mgmt",
        explanation:
          "Nursery pigs need higher temperatures (28-32°C) due to their limited thermoregulation ability.",
      },
      {
        question:
          "What should be the minimum ventilation rate per pig in winter?",
        type: "single",
        options: ["2-4 CFM", "8-12 CFM", "15-20 CFM", "25-30 CFM"],
        correctAnswers: ["8-12 CFM"],
        category: "Environment Mgmt",
        explanation:
          "Minimum winter ventilation of 8-12 CFM per pig maintains air quality while conserving heat.",
      },
      {
        question: "What is the recommended floor space per finishing pig?",
        type: "single",
        options: ["0.5 m²", "0.8 m²", "1.2 m²", "1.8 m²"],
        correctAnswers: ["0.8 m²"],
        category: "Environment Mgmt",
        explanation:
          "Finishing pigs need approximately 0.8 m² of floor space for comfort and proper growth.",
      },
      {
        question: "Which flooring type provides the best comfort for sows?",
        type: "single",
        options: [
          "Full slats",
          "Solid concrete",
          "Rubber mats",
          "Straw bedding",
        ],
        correctAnswers: ["Rubber mats"],
        category: "Environment Mgmt",
        explanation:
          "Rubber mats provide comfort, insulation, and good drainage for sow welfare.",
      },

      // GROWTH & WEIGHT MGMT QUESTIONS
      {
        question: "What is the average daily weight gain for finishing pigs?",
        type: "single",
        options: ["0.3-0.5 kg", "0.7-0.9 kg", "1.2-1.5 kg", "2.0-2.5 kg"],
        correctAnswers: ["0.7-0.9 kg"],
        category: "Growth & Weight Mgmt",
        explanation:
          "Well-managed finishing pigs typically gain 0.7-0.9 kg per day with proper nutrition.",
      },
      {
        question: "At what weight should pigs typically be marketed?",
        type: "single",
        options: ["80-90 kg", "110-120 kg", "140-150 kg", "170-180 kg"],
        correctAnswers: ["110-120 kg"],
        category: "Growth & Weight Mgmt",
        explanation:
          "Market weight of 110-120 kg provides optimal carcass composition and economic returns.",
      },
      {
        question:
          "What is the feed conversion ratio for efficient finishing pigs?",
        type: "single",
        options: ["1.5:1", "2.5:1", "3.5:1", "4.5:1"],
        correctAnswers: ["2.5:1"],
        category: "Growth & Weight Mgmt",
        explanation:
          "Efficient finishing pigs convert 2.5 kg of feed into 1 kg of body weight gain.",
      },
      {
        question: "When should pigs be weighed for growth monitoring?",
        type: "single",
        options: ["Daily", "Weekly", "Bi-weekly", "Monthly"],
        correctAnswers: ["Weekly"],
        category: "Growth & Weight Mgmt",
        explanation:
          "Weekly weighing provides adequate monitoring without excessive stress to the animals.",
      },

      // FARROWING MGMT QUESTIONS
      {
        question:
          "How many days before farrowing should sows be moved to farrowing pens?",
        type: "single",
        options: ["2-3 days", "5-7 days", "10-12 days", "14-16 days"],
        correctAnswers: ["5-7 days"],
        category: "Farrowing Mgmt",
        explanation:
          "Moving sows 5-7 days before farrowing allows time to acclimate and reduce stress.",
      },
      {
        question: "What is the ideal temperature for newborn piglets?",
        type: "single",
        options: ["25-28°C", "30-35°C", "37-40°C", "42-45°C"],
        correctAnswers: ["30-35°C"],
        category: "Farrowing Mgmt",
        explanation:
          "Newborn piglets need 30-35°C in the creep area for proper thermoregulation.",
      },
      {
        question: "When should piglets receive their first colostrum?",
        type: "single",
        options: [
          "Within 30 minutes",
          "Within 6 hours",
          "Within 12 hours",
          "Within 24 hours",
        ],
        correctAnswers: ["Within 6 hours"],
        category: "Farrowing Mgmt",
        explanation:
          "Piglets must receive colostrum within 6 hours for passive immunity transfer.",
      },
      {
        question: "What is the typical weaning age for piglets?",
        type: "single",
        options: ["14 days", "21-28 days", "35-42 days", "56 days"],
        correctAnswers: ["21-28 days"],
        category: "Farrowing Mgmt",
        explanation:
          "Most commercial operations wean piglets at 21-28 days when digestive systems are developed.",
      },

      // RECORD & FARM MGMT QUESTIONS
      {
        question: "Which record is most important for breeding management?",
        type: "single",
        options: [
          "Feed consumption",
          "Breeding dates",
          "Water intake",
          "Temperature logs",
        ],
        correctAnswers: ["Breeding dates"],
        category: "Record & Farm Mgmt",
        explanation:
          "Accurate breeding dates are essential for predicting farrowing and managing reproduction cycles.",
      },
      {
        question: "How often should production records be reviewed?",
        type: "single",
        options: ["Daily", "Weekly", "Monthly", "Quarterly"],
        correctAnswers: ["Weekly"],
        category: "Record & Farm Mgmt",
        explanation:
          "Weekly review allows timely identification of trends and prompt corrective actions.",
      },
      {
        question: "What is the key performance indicator for sow productivity?",
        type: "single",
        options: [
          "Feed efficiency",
          "Pigs weaned per sow per year",
          "Daily gain",
          "Mortality rate",
        ],
        correctAnswers: ["Pigs weaned per sow per year"],
        category: "Record & Farm Mgmt",
        explanation:
          "Pigs weaned per sow per year is the primary measure of sow reproductive efficiency.",
      },
      {
        question:
          "Which software feature is most important for pig farm management?",
        type: "single",
        options: ["Graphics", "Data backup", "Color coding", "Sound alerts"],
        correctAnswers: ["Data backup"],
        category: "Record & Farm Mgmt",
        explanation:
          "Data backup ensures valuable farm records are protected against loss or corruption.",
      },

      // MARKETING & FINANCE QUESTIONS
      {
        question: "What factor most influences pig market prices?",
        type: "single",
        options: [
          "Weather",
          "Feed costs",
          "Consumer demand",
          "Government policies",
        ],
        correctAnswers: ["Feed costs"],
        category: "Marketing & Finance",
        explanation:
          "Feed costs represent 60-70% of production costs and directly impact profitability and pricing.",
      },
      {
        question: "When is the best time to market pigs for premium prices?",
        type: "single",
        options: [
          "Summer",
          "Just before holidays",
          "During winter",
          "Early spring",
        ],
        correctAnswers: ["Just before holidays"],
        category: "Marketing & Finance",
        explanation:
          "Holiday seasons typically see increased pork demand and higher market prices.",
      },
      {
        question:
          "What percentage of total costs does feed typically represent?",
        type: "single",
        options: ["40-50%", "60-70%", "80-90%", "95-100%"],
        correctAnswers: ["60-70%"],
        category: "Marketing & Finance",
        explanation:
          "Feed costs typically account for 60-70% of total pig production expenses.",
      },
      {
        question: "Which marketing strategy reduces price risk?",
        type: "single",
        options: [
          "Spot sales",
          "Contract farming",
          "Direct sales",
          "Auction sales",
        ],
        correctAnswers: ["Contract farming"],
        category: "Marketing & Finance",
        explanation:
          "Contract farming provides price certainty and reduces market volatility risks.",
      },

      // MULTIPLE CHOICE QUESTIONS
      {
        question: "Which factors affect pig growth rate? (Select multiple)",
        type: "multiple",
        options: [
          "Genetics",
          "Nutrition",
          "Environment",
          "Health status",
          "Weather only",
        ],
        correctAnswers: [
          "Genetics",
          "Nutrition",
          "Environment",
          "Health status",
        ],
        category: "Growth & Weight Mgmt",
        explanation:
          "Multiple factors including genetics, nutrition, environment, and health all influence growth rates.",
      },
      {
        question:
          "What are essential components of biosecurity? (Select multiple)",
        type: "multiple",
        options: [
          "Visitor control",
          "Disinfection",
          "Quarantine",
          "Record keeping",
          "Feed storage",
        ],
        correctAnswers: ["Visitor control", "Disinfection", "Quarantine"],
        category: "Disease Control",
        explanation:
          "Effective biosecurity requires controlling access, proper disinfection, and quarantine protocols.",
      },
      {
        question: "Which vitamins are fat-soluble? (Select multiple)",
        type: "multiple",
        options: [
          "Vitamin A",
          "Vitamin B",
          "Vitamin D",
          "Vitamin E",
          "Vitamin K",
        ],
        correctAnswers: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"],
        category: "Feeding & Nutrition",
        explanation:
          "Vitamins A, D, E, and K are fat-soluble and require dietary fat for proper absorption.",
      },

      // TRUE/FALSE QUESTIONS
      {
        question: "Pigs can see colors similar to humans.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Environment Mgmt",
        explanation:
          "Pigs have dichromatic vision and cannot see the full color spectrum that humans can.",
      },
      {
        question: "Sows should be fed the same diet throughout gestation.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Feeding & Nutrition",
        explanation:
          "Sow nutrition needs change throughout gestation, requiring different feeding programs.",
      },
      {
        question: "Castration reduces aggressive behavior in male pigs.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["True"],
        category: "Breeding & Insemination",
        explanation:
          "Castration eliminates testosterone production, reducing aggressive and sexual behaviors.",
      },
      {
        question: "Pigs require mud for thermoregulation in hot weather.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["True"],
        category: "Environment Mgmt",
        explanation:
          "Pigs cannot sweat efficiently, so wallowing in mud helps them cool down in hot weather.",
      },
      {
        question: "All pig diseases can be prevented with vaccination.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Disease Control",
        explanation:
          "Many pig diseases, like African Swine Fever, have no available vaccines.",
      },
      {
        question: "Boars can be used for breeding at 6 months of age.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Breeding & Insemination",
        explanation:
          "Boars should not be used for breeding until 8-10 months when sexually mature.",
      },
      {
        question: "Proper ventilation reduces respiratory diseases in pigs.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["True"],
        category: "Environment Mgmt",
        explanation:
          "Good ventilation removes harmful gases and pathogens, reducing respiratory disease risk.",
      },
      {
        question: "Feed conversion efficiency improves with pig age.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Growth & Weight Mgmt",
        explanation:
          "Feed conversion efficiency typically decreases as pigs get older and heavier.",
      },
      {
        question: "Cross-fostering should be done within 48 hours of birth.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["True"],
        category: "Farrowing Mgmt",
        explanation:
          "Cross-fostering is most successful when done within the first 48 hours after birth.",
      },
      {
        question:
          "Electronic records are always more accurate than paper records.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["False"],
        category: "Record & Farm Mgmt",
        explanation:
          "Record accuracy depends on proper data entry, not the recording method used.",
      },
      {
        question: "Futures contracts can help stabilize farm income.",
        type: "true_false",
        options: ["True", "False"],
        correctAnswers: ["True"],
        category: "Marketing & Finance",
        explanation:
          "Futures contracts allow farmers to lock in prices and reduce market volatility risks.",
      },
    ];

    console.log("📊 QUESTIONS SETUP:");
    console.log("══════════════════════════════════════════════════");
    console.log(`Total questions prepared: ${baseQuestionsData.length}`);
    console.log("These same questions will be used for ALL categories\n");

    // Create or update quizzes for each available category
    for (const tag of tags) {
      const categoryName = tag.name;
      const categoryTag = tagMap.get(categoryName);
      if (!categoryTag) {
        console.log(`⚠️  Skipping category "${categoryName}" - tag not found`);
        continue;
      }

      console.log(`\n🎯 Processing ${categoryName} Quiz...`);

      // Create or find quiz for this category
      const [quiz, created] = await Quiz.findOrCreate({
        where: {
          title: `${categoryName} Quiz`,
          best_practice_tag_id: categoryTag.id,
        },
        defaults: {
          title: `${categoryName} Quiz`,
          description: `Comprehensive quiz covering ${categoryName.toLowerCase()} best practices in pig farming`,
          duration: 10, // 10 minutes
          passing_score: 70,
          is_active: true,
          best_practice_tag_id: categoryTag.id,
          created_by: user.id,
        },
        transaction,
      });

      if (created) {
        console.log(`✅ Created new quiz: ${quiz.title} (ID: ${quiz.id})`);
      } else {
        console.log(`📄 Using existing quiz: ${quiz.title} (ID: ${quiz.id})`);

        // Clear existing questions for this quiz
        await QuizQuestion.destroy({
          where: { quiz_id: quiz.id },
          transaction,
        });
        console.log(`🗑️  Cleared existing questions for ${quiz.title}`);
      }

      // Insert questions for this category
      console.log(`📝 Inserting ${baseQuestionsData.length} questions...`);

      for (let i = 0; i < baseQuestionsData.length; i++) {
        const questionData = baseQuestionsData[i]; // Create the question
        const question = await QuizQuestion.create(
          {
            quiz_id: quiz.id,
            text: questionData.question,
            explanation: questionData.explanation || "",
            order_index: i + 1,
            type:
              questionData.type === "single"
                ? "mcq"
                : questionData.type === "multiple"
                ? "multi"
                : "truefalse",
            difficulty: "medium",
            is_active: true,
            is_deleted: false,
          },
          { transaction }
        );

        // Create options for the question
        if (questionData.options) {
          for (let j = 0; j < questionData.options.length; j++) {
            const optionText = questionData.options[j];
            const isCorrect = questionData.correctAnswers.includes(optionText);

            await QuizQuestionOption.create(
              {
                question_id: question.id,
                text: optionText,
                is_correct: isCorrect,
                order_index: j + 1,
                is_deleted: false,
              },
              { transaction }
            );
          }
        }

        // Progress indicator
        if ((i + 1) % 5 === 0) {
          console.log(
            `✅ Processed ${i + 1}/${
              baseQuestionsData.length
            } questions for ${categoryName}...`
          );
        }
      }

      console.log(
        `✅ Completed ${categoryName} Quiz with ${baseQuestionsData.length} questions`
      );
    }

    await transaction.commit();

    console.log("\n🎉 SUCCESS! Category-specific quizzes created!");
    console.log("══════════════════════════════════════════════════");

    // Summary
    console.log("📋 QUIZ SUMMARY:");
    for (const tag of tags) {
      console.log(`✅ ${tag.name} Quiz: ${baseQuestionsData.length} questions`);
    }

    console.log(
      `\n👤 Created by: ${user.firstname} ${user.lastname} (${user.email})`
    );
    console.log("🎯 All quizzes are active and ready for use!");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

populateCategorySpecificQuizzes();
