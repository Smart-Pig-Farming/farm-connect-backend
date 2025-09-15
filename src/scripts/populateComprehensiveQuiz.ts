/**
 * Script to populate the "Comprehensive Pig Farming Quiz" with 50 questions
 * Dynamically finds quiz ID and user ID to work across different environments
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
  category?: string;
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

    // Get all available tags for mapping
    const tags = await BestPracticeTag.findAll();
    const tagMap = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag.id]));

    console.log(`✅ Found Quiz ID: ${quiz.id}`);
    console.log(`✅ Found User ID: ${user.id}`);
    console.log(`✅ Available tags: ${tags.map((t) => t.name).join(", ")}\n`);

    // Define all 50 questions with their data
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
        category: "Breeding & Insemination",
      },
      {
        question:
          "Which breed is known for producing the highest quality bacon?",
        type: "single",
        options: ["Yorkshire", "Hampshire", "Landrace", "Duroc"],
        correctAnswers: ["Landrace"],
        category: "Breeding & Insemination",
      },
      {
        question:
          "What percentage of a pig's diet should typically consist of protein for growing pigs?",
        type: "single",
        options: ["8-10%", "14-18%", "22-26%", "30-34%"],
        correctAnswers: ["14-18%"],
        category: "Feeding & Nutrition",
      },
      {
        question: "At what weight are pigs typically sent to market?",
        type: "single",
        options: ["180-200 lbs", "220-280 lbs", "300-350 lbs", "400-450 lbs"],
        correctAnswers: ["220-280 lbs"],
        category: "Growth & Weight Mgmt",
      },
      {
        question:
          "What is the most common flooring system in modern pig facilities?",
        type: "single",
        options: [
          "Concrete solid floors",
          "Partially slatted floors",
          "Fully slatted floors",
          "Dirt floors",
        ],
        correctAnswers: ["Partially slatted floors"],
        category: "Environment Mgmt",
      },
      {
        question: "Which vitamin deficiency causes rickets in pigs?",
        type: "single",
        options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin E"],
        correctAnswers: ["Vitamin D"],
        category: "Feeding & Nutrition",
      },
      {
        question: "What is the ideal pH range for pig drinking water?",
        type: "single",
        options: ["5.5-6.5", "6.5-7.5", "7.5-8.5", "8.5-9.5"],
        correctAnswers: ["6.5-7.5"],
        category: "Environment Mgmt",
      },
      {
        question: "How many teats should a breeding sow ideally have?",
        type: "single",
        options: ["10", "12", "14", "16"],
        correctAnswers: ["14"],
        category: "Breeding & Insemination",
      },
      {
        question:
          "What is the primary symptom of Porcine Reproductive and Respiratory Syndrome (PRRS)?",
        type: "single",
        options: [
          "Diarrhea",
          "Respiratory distress and reproductive failure",
          "Skin lesions",
          "Lameness",
        ],
        correctAnswers: ["Respiratory distress and reproductive failure"],
        category: "Disease Control",
      },
      {
        question:
          "Which management practice helps prevent tail biting in pigs?",
        type: "single",
        options: [
          "Increasing stocking density",
          "Providing environmental enrichment",
          "Reducing feed quality",
          "Limiting water access",
        ],
        correctAnswers: ["Providing environmental enrichment"],
        category: "Environment Mgmt",
      },
      {
        question: "What is the normal body temperature of a healthy pig?",
        type: "single",
        options: [
          "98.6°F (37°C)",
          "100.4°F (38°C)",
          "102.5°F (39.2°C)",
          "105°F (40.6°C)",
        ],
        correctAnswers: ["102.5°F (39.2°C)"],
        category: "Disease Control",
      },
      {
        question:
          "Which feed additive is commonly used to promote growth in pigs?",
        type: "single",
        options: ["Salt", "Limestone", "Lysine", "Sand"],
        correctAnswers: ["Lysine"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "What is the minimum space requirement for a gestating sow in group housing?",
        type: "single",
        options: [
          "15 square feet",
          "20 square feet",
          "24 square feet",
          "30 square feet",
        ],
        correctAnswers: ["24 square feet"],
        category: "Environment Mgmt",
      },
      {
        question:
          "Which disease is characterized by diamond-shaped skin lesions in pigs?",
        type: "single",
        options: [
          "Swine flu",
          "Erysipelas",
          "Foot-and-mouth disease",
          "Pseudorabies",
        ],
        correctAnswers: ["Erysipelas"],
        category: "Disease Control",
      },
      {
        question:
          "What is the recommended crude fiber percentage in pig diets?",
        type: "single",
        options: ["2-4%", "6-8%", "10-12%", "15-18%"],
        correctAnswers: ["6-8%"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "How often should farrowing pens be thoroughly cleaned and disinfected?",
        type: "single",
        options: ["After each litter", "Monthly", "Quarterly", "Annually"],
        correctAnswers: ["After each litter"],
        category: "Farrowing Mgmt",
      },
      {
        question: "What is the estrus cycle length in sows?",
        type: "single",
        options: ["18 days", "21 days", "24 days", "28 days"],
        correctAnswers: ["21 days"],
        category: "Breeding & Insemination",
      },
      {
        question: "Which mineral deficiency causes anemia in piglets?",
        type: "single",
        options: ["Calcium", "Iron", "Zinc", "Copper"],
        correctAnswers: ["Iron"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "What percentage of live weight does the pig's stomach represent?",
        type: "single",
        options: ["0.5-1%", "1.5-2%", "3-4%", "5-6%"],
        correctAnswers: ["0.5-1%"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Which vaccination is typically given to piglets at 2-3 weeks of age?",
        type: "single",
        options: ["PRRS", "Mycoplasma", "PCV2", "All of the above"],
        correctAnswers: ["All of the above"],
        category: "Disease Control",
      },
      {
        question: "What is the recommended stocking density for nursery pigs?",
        type: "single",
        options: [
          "2-3 square feet per pig",
          "4-5 square feet per pig",
          "6-7 square feet per pig",
          "8-10 square feet per pig",
        ],
        correctAnswers: ["4-5 square feet per pig"],
        category: "Environment Mgmt",
      },
      {
        question: "Which type of corn is preferred in pig diets?",
        type: "single",
        options: ["Dent corn", "Flint corn", "Sweet corn", "Popcorn"],
        correctAnswers: ["Dent corn"],
        category: "Feeding & Nutrition",
      },
      {
        question: "What is the primary function of the creep feeder?",
        type: "single",
        options: [
          "Feed pregnant sows",
          "Provide supplemental feed to nursing piglets",
          "Water lactating sows",
          "Store bulk feed",
        ],
        correctAnswers: ["Provide supplemental feed to nursing piglets"],
        category: "Farrowing Mgmt",
      },
      {
        question: "Which gas is produced in largest quantities in pig manure?",
        type: "single",
        options: ["Ammonia", "Methane", "Carbon dioxide", "Hydrogen sulfide"],
        correctAnswers: ["Carbon dioxide"],
        category: "Environment Mgmt",
      },
      {
        question: "What is the recommended age for first breeding of gilts?",
        type: "single",
        options: ["4-5 months", "6-7 months", "8-9 months", "10-12 months"],
        correctAnswers: ["8-9 months"],
        category: "Breeding & Insemination",
      },

      // MULTIPLE CHOICE QUESTIONS (26-35)
      {
        question:
          "Which factors affect feed conversion efficiency in pigs? (Select all that apply)",
        type: "multiple",
        options: [
          "Genetics",
          "Feed quality",
          "Environmental temperature",
          "Health status",
          "Housing conditions",
        ],
        correctAnswers: [
          "Genetics",
          "Feed quality",
          "Environmental temperature",
          "Health status",
          "Housing conditions",
        ],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Which signs indicate heat stress in pigs? (Select all that apply)",
        type: "multiple",
        options: [
          "Panting",
          "Reduced feed intake",
          "Increased water consumption",
          "Lethargy",
          "Increased aggression",
        ],
        correctAnswers: [
          "Panting",
          "Reduced feed intake",
          "Increased water consumption",
          "Lethargy",
        ],
        category: "Environment Mgmt",
      },
      {
        question:
          "Which biosecurity measures help prevent disease transmission? (Select all that apply)",
        type: "multiple",
        options: [
          "Visitor restrictions",
          "Proper disposal of dead animals",
          "Feed supplier verification",
          "Regular disinfection",
          "Staff training",
        ],
        correctAnswers: [
          "Visitor restrictions",
          "Proper disposal of dead animals",
          "Feed supplier verification",
          "Regular disinfection",
          "Staff training",
        ],
        category: "Disease Control",
      },
      {
        question:
          "Which nutrients are essential for proper bone development in pigs? (Select all that apply)",
        type: "multiple",
        options: ["Calcium", "Phosphorus", "Vitamin D", "Protein", "Vitamin A"],
        correctAnswers: ["Calcium", "Phosphorus", "Vitamin D", "Protein"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Which management practices can reduce piglet mortality? (Select all that apply)",
        type: "multiple",
        options: [
          "Cross-fostering",
          "Providing heat lamps",
          "Split suckling",
          "Iron injections",
          "Tail docking",
        ],
        correctAnswers: [
          "Cross-fostering",
          "Providing heat lamps",
          "Split suckling",
          "Iron injections",
        ],
        category: "Farrowing Mgmt",
      },
      {
        question:
          "Which environmental factors should be controlled in pig housing? (Select all that apply)",
        type: "multiple",
        options: [
          "Temperature",
          "Humidity",
          "Air quality",
          "Lighting",
          "Noise levels",
        ],
        correctAnswers: [
          "Temperature",
          "Humidity",
          "Air quality",
          "Lighting",
          "Noise levels",
        ],
        category: "Environment Mgmt",
      },
      {
        question:
          "Which diseases require immediate reporting to veterinary authorities? (Select all that apply)",
        type: "multiple",
        options: [
          "African Swine Fever",
          "Classical Swine Fever",
          "Foot-and-Mouth Disease",
          "Common cold",
          "Pseudorabies",
        ],
        correctAnswers: [
          "African Swine Fever",
          "Classical Swine Fever",
          "Foot-and-Mouth Disease",
          "Pseudorabies",
        ],
        category: "Disease Control",
      },
      {
        question:
          "Which breeding methods are commonly used in commercial pig production? (Select all that apply)",
        type: "multiple",
        options: [
          "Natural mating",
          "Artificial insemination",
          "Embryo transfer",
          "Cloning",
          "Hand mating",
        ],
        correctAnswers: [
          "Natural mating",
          "Artificial insemination",
          "Embryo transfer",
          "Hand mating",
        ],
        category: "Breeding & Insemination",
      },
      {
        question:
          "Which feed ingredients are good sources of energy for pigs? (Select all that apply)",
        type: "multiple",
        options: ["Corn", "Wheat", "Barley", "Soybean meal", "Fat/Oil"],
        correctAnswers: ["Corn", "Wheat", "Barley", "Fat/Oil"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Which water quality parameters should be regularly monitored? (Select all that apply)",
        type: "multiple",
        options: [
          "pH level",
          "Bacterial count",
          "Nitrate levels",
          "Hardness",
          "Temperature",
        ],
        correctAnswers: [
          "pH level",
          "Bacterial count",
          "Nitrate levels",
          "Hardness",
          "Temperature",
        ],
        category: "Environment Mgmt",
      },

      // TRUE/FALSE QUESTIONS (36-50)
      {
        question:
          "Pigs are naturally clean animals and will not soil their sleeping areas if given adequate space.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Environment Mgmt",
      },
      {
        question:
          "Sows should be fed the same diet throughout pregnancy and lactation.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation: "Diet should be adjusted based on stage",
        category: "Feeding & Nutrition",
      },
      {
        question: "Castration of male pigs eliminates boar taint in pork.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Record & Farm Mgmt",
      },
      {
        question:
          "Pigs can synthesize Vitamin C in their bodies and do not require it in their diet.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Group housing of pregnant sows is being phased out in favor of individual stalls.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation: "Group housing is being favored over individual stalls",
        category: "Environment Mgmt",
      },
      {
        question:
          "Antibiotics used as growth promoters in pig feed are still widely approved in the United States.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation: "Growth promotion use has been largely eliminated",
        category: "Disease Control",
      },
      {
        question:
          "Pigs have excellent eyesight but poor hearing compared to other farm animals.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation: "Pigs have good hearing but relatively poor eyesight",
        category: "Record & Farm Mgmt",
      },
      {
        question:
          "The genetic potential for litter size in modern sows has increased significantly over the past 30 years.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Breeding & Insemination",
      },
      {
        question:
          "Pigs can be successfully raised on pasture systems without any supplemental feeding.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation: "Supplemental feeding is typically necessary",
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Split-sex feeding (feeding barrows and gilts separately) can improve feed efficiency.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Zinc oxide is commonly added to nursery pig diets to prevent diarrhea.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Feeding & Nutrition",
      },
      {
        question:
          "Pigs require the same amount of water per pound of body weight as cattle.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation:
          "Pigs typically require more water per pound of body weight",
        category: "Environment Mgmt",
      },
      {
        question: "Tail biting in pigs is always caused by overcrowding.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation:
          "Multiple factors can cause tail biting, not just overcrowding",
        category: "Environment Mgmt",
      },
      {
        question:
          "Gilt offspring typically have smaller litters than sow offspring in their first parity.",
        type: "true_false",
        correctAnswers: ["True"],
        category: "Breeding & Insemination",
      },
      {
        question:
          "Modern pig production systems have completely eliminated the need for outdoor access.",
        type: "true_false",
        correctAnswers: ["False"],
        explanation:
          "Some systems still provide outdoor access, and welfare concerns persist",
        category: "Environment Mgmt",
      },
    ];

    console.log(`📝 Inserting ${questionsData.length} questions...\n`);

    let questionCount = 0;
    let optionCount = 0;

    // Process each question
    for (let i = 0; i < questionsData.length; i++) {
      const questionData = questionsData[i];

      // Find the best practice tag ID (fallback to quiz's tag if not found)
      let bestPracticeTagId = quiz.best_practice_tag_id; // Default fallback

      if (questionData.category) {
        const categoryTagId = tagMap.get(questionData.category.toLowerCase());
        if (categoryTagId) {
          bestPracticeTagId = categoryTagId;
        }
      }

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

      // Create the question
      const question = await QuizQuestion.create(
        {
          quiz_id: quiz.id,
          text: questionData.question,
          type: questionType,
          order_index: i + 1,
          difficulty: "medium", // Default difficulty
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
