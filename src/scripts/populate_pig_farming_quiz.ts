import dotenv from "dotenv";
import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import QuizQuestion from "../models/QuizQuestion";
import QuizQuestionOption from "../models/QuizQuestionOption";
import BestPracticeTag from "../models/BestPracticeTag";
import User from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";

/*
  Comprehensive Pig Farming Quiz Population Script
  Creates a 50-question quiz covering all aspects of pig farming
  - Questions 1-25: Single choice (MCQ)
  - Questions 26-35: Multiple choice (Multi)
  - Questions 36-50: True/False
*/

dotenv.config();

interface QuizData {
  question: string;
  type: "mcq" | "multi" | "truefalse";
  difficulty: "easy" | "medium" | "hard";
  explanation?: string;
  options: {
    text: string;
    is_correct: boolean;
  }[];
}

const quizData: QuizData[] = [
  // SINGLE CHOICE QUESTIONS (1-25)
  {
    question: "What is the average litter size for modern commercial sows?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Modern commercial sows typically produce 10-12 piglets per litter due to genetic improvements and proper nutrition management.",
    options: [
      { text: "6-8 piglets", is_correct: false },
      { text: "10-12 piglets", is_correct: true },
      { text: "14-16 piglets", is_correct: false },
      { text: "18-20 piglets", is_correct: false }
    ]
  },
  {
    question: "Which breed is known for producing the highest quality bacon?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Landrace pigs are specifically bred for their lean meat quality and are particularly valued for bacon production.",
    options: [
      { text: "Yorkshire", is_correct: false },
      { text: "Hampshire", is_correct: false },
      { text: "Landrace", is_correct: true },
      { text: "Duroc", is_correct: false }
    ]
  },
  {
    question: "What percentage of a pig's diet should typically consist of protein for growing pigs?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Growing pigs require 14-18% protein in their diet to support rapid muscle development and growth.",
    options: [
      { text: "8-10%", is_correct: false },
      { text: "14-18%", is_correct: true },
      { text: "22-26%", is_correct: false },
      { text: "30-34%", is_correct: false }
    ]
  },
  {
    question: "At what weight are pigs typically sent to market?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Market weight for pigs is typically 220-280 lbs, which provides optimal feed conversion efficiency and meat quality.",
    options: [
      { text: "180-200 lbs", is_correct: false },
      { text: "220-280 lbs", is_correct: true },
      { text: "300-350 lbs", is_correct: false },
      { text: "400-450 lbs", is_correct: false }
    ]
  },
  {
    question: "What is the most common flooring system in modern pig facilities?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Partially slatted floors provide good manure management while maintaining animal comfort and welfare.",
    options: [
      { text: "Concrete solid floors", is_correct: false },
      { text: "Partially slatted floors", is_correct: true },
      { text: "Fully slatted floors", is_correct: false },
      { text: "Dirt floors", is_correct: false }
    ]
  },
  {
    question: "Which vitamin deficiency causes rickets in pigs?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Vitamin D deficiency leads to poor calcium absorption, resulting in rickets and weak bone development.",
    options: [
      { text: "Vitamin A", is_correct: false },
      { text: "Vitamin C", is_correct: false },
      { text: "Vitamin D", is_correct: true },
      { text: "Vitamin E", is_correct: false }
    ]
  },
  {
    question: "What is the ideal pH range for pig drinking water?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Water pH between 6.5-7.5 is optimal for pig health and prevents equipment corrosion and bacterial growth.",
    options: [
      { text: "5.5-6.5", is_correct: false },
      { text: "6.5-7.5", is_correct: true },
      { text: "7.5-8.5", is_correct: false },
      { text: "8.5-9.5", is_correct: false }
    ]
  },
  {
    question: "How many teats should a breeding sow ideally have?",
    type: "mcq",
    difficulty: "easy",
    explanation: "14 teats allows a sow to adequately nurse larger litters, which is important for modern prolific genetics.",
    options: [
      { text: "10", is_correct: false },
      { text: "12", is_correct: false },
      { text: "14", is_correct: true },
      { text: "16", is_correct: false }
    ]
  },
  {
    question: "What is the primary symptom of Porcine Reproductive and Respiratory Syndrome (PRRS)?",
    type: "mcq",
    difficulty: "hard",
    explanation: "PRRS is characterized by respiratory problems in pigs of all ages and reproductive failure in breeding stock.",
    options: [
      { text: "Diarrhea", is_correct: false },
      { text: "Respiratory distress and reproductive failure", is_correct: true },
      { text: "Skin lesions", is_correct: false },
      { text: "Lameness", is_correct: false }
    ]
  },
  {
    question: "Which management practice helps prevent tail biting in pigs?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Environmental enrichment provides mental stimulation and reduces stress-related behaviors like tail biting.",
    options: [
      { text: "Increasing stocking density", is_correct: false },
      { text: "Providing environmental enrichment", is_correct: true },
      { text: "Reducing feed quality", is_correct: false },
      { text: "Limiting water access", is_correct: false }
    ]
  },
  {
    question: "What is the normal body temperature of a healthy pig?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Normal pig body temperature is 102.5°F (39.2°C), which is higher than human body temperature.",
    options: [
      { text: "98.6°F (37°C)", is_correct: false },
      { text: "100.4°F (38°C)", is_correct: false },
      { text: "102.5°F (39.2°C)", is_correct: true },
      { text: "105°F (40.6°C)", is_correct: false }
    ]
  },
  {
    question: "Which feed additive is commonly used to promote growth in pigs?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Lysine is an essential amino acid that promotes lean muscle growth and improves feed conversion efficiency.",
    options: [
      { text: "Salt", is_correct: false },
      { text: "Limestone", is_correct: false },
      { text: "Lysine", is_correct: true },
      { text: "Sand", is_correct: false }
    ]
  },
  {
    question: "What is the minimum space requirement for a gestating sow in group housing?",
    type: "mcq",
    difficulty: "hard",
    explanation: "24 square feet per sow in group housing allows for natural movement and social interaction while meeting welfare standards.",
    options: [
      { text: "15 square feet", is_correct: false },
      { text: "20 square feet", is_correct: false },
      { text: "24 square feet", is_correct: true },
      { text: "30 square feet", is_correct: false }
    ]
  },
  {
    question: "Which disease is characterized by diamond-shaped skin lesions in pigs?",
    type: "mcq",
    difficulty: "hard",
    explanation: "Erysipelas causes characteristic diamond-shaped skin lesions and can affect multiple organ systems.",
    options: [
      { text: "Swine flu", is_correct: false },
      { text: "Erysipelas", is_correct: true },
      { text: "Foot-and-mouth disease", is_correct: false },
      { text: "Pseudorabies", is_correct: false }
    ]
  },
  {
    question: "What is the recommended crude fiber percentage in pig diets?",
    type: "mcq",
    difficulty: "medium",
    explanation: "6-8% crude fiber provides digestive health benefits while maintaining optimal nutrient digestibility.",
    options: [
      { text: "2-4%", is_correct: false },
      { text: "6-8%", is_correct: true },
      { text: "10-12%", is_correct: false },
      { text: "15-18%", is_correct: false }
    ]
  },
  {
    question: "How often should farrowing pens be thoroughly cleaned and disinfected?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Cleaning after each litter prevents disease transmission and provides a hygienic environment for newborn piglets.",
    options: [
      { text: "After each litter", is_correct: true },
      { text: "Monthly", is_correct: false },
      { text: "Quarterly", is_correct: false },
      { text: "Annually", is_correct: false }
    ]
  },
  {
    question: "What is the estrus cycle length in sows?",
    type: "mcq",
    difficulty: "medium",
    explanation: "The estrus cycle in sows averages 21 days, which is important for breeding management and timing.",
    options: [
      { text: "18 days", is_correct: false },
      { text: "21 days", is_correct: true },
      { text: "24 days", is_correct: false },
      { text: "28 days", is_correct: false }
    ]
  },
  {
    question: "Which mineral deficiency causes anemia in piglets?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Iron deficiency is common in nursing piglets because sow's milk is low in iron, requiring supplementation.",
    options: [
      { text: "Calcium", is_correct: false },
      { text: "Iron", is_correct: true },
      { text: "Zinc", is_correct: false },
      { text: "Copper", is_correct: false }
    ]
  },
  {
    question: "What percentage of live weight does the pig's stomach represent?",
    type: "mcq",
    difficulty: "hard",
    explanation: "The pig's stomach is relatively small (0.5-1% of body weight), reflecting their simple stomach digestion system.",
    options: [
      { text: "0.5-1%", is_correct: true },
      { text: "1.5-2%", is_correct: false },
      { text: "3-4%", is_correct: false },
      { text: "5-6%", is_correct: false }
    ]
  },
  {
    question: "Which vaccination is typically given to piglets at 2-3 weeks of age?",
    type: "mcq",
    difficulty: "hard",
    explanation: "A comprehensive vaccination program including PRRS, Mycoplasma, and PCV2 is standard at 2-3 weeks of age.",
    options: [
      { text: "PRRS", is_correct: false },
      { text: "Mycoplasma", is_correct: false },
      { text: "PCV2", is_correct: false },
      { text: "All of the above", is_correct: true }
    ]
  },
  {
    question: "What is the recommended stocking density for nursery pigs?",
    type: "mcq",
    difficulty: "medium",
    explanation: "4-5 square feet per pig in the nursery allows for proper growth while maintaining good air quality and comfort.",
    options: [
      { text: "2-3 square feet per pig", is_correct: false },
      { text: "4-5 square feet per pig", is_correct: true },
      { text: "6-7 square feet per pig", is_correct: false },
      { text: "8-10 square feet per pig", is_correct: false }
    ]
  },
  {
    question: "Which type of corn is preferred in pig diets?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Dent corn has the optimal starch content and digestibility for pig nutrition and feed conversion.",
    options: [
      { text: "Dent corn", is_correct: true },
      { text: "Flint corn", is_correct: false },
      { text: "Sweet corn", is_correct: false },
      { text: "Popcorn", is_correct: false }
    ]
  },
  {
    question: "What is the primary function of the creep feeder?",
    type: "mcq",
    difficulty: "easy",
    explanation: "Creep feeders provide high-quality starter feed to nursing piglets, supplementing sow's milk and preparing for weaning.",
    options: [
      { text: "Feed pregnant sows", is_correct: false },
      { text: "Provide supplemental feed to nursing piglets", is_correct: true },
      { text: "Water lactating sows", is_correct: false },
      { text: "Store bulk feed", is_correct: false }
    ]
  },
  {
    question: "Which gas is produced in largest quantities in pig manure?",
    type: "mcq",
    difficulty: "medium",
    explanation: "Carbon dioxide is the primary gas produced during manure decomposition, though ammonia and methane are also significant.",
    options: [
      { text: "Ammonia", is_correct: false },
      { text: "Methane", is_correct: false },
      { text: "Carbon dioxide", is_correct: true },
      { text: "Hydrogen sulfide", is_correct: false }
    ]
  },
  {
    question: "What is the recommended age for first breeding of gilts?",
    type: "mcq",
    difficulty: "medium",
    explanation: "8-9 months allows gilts to reach proper physical maturity and weight for successful breeding and farrowing.",
    options: [
      { text: "4-5 months", is_correct: false },
      { text: "6-7 months", is_correct: false },
      { text: "8-9 months", is_correct: true },
      { text: "10-12 months", is_correct: false }
    ]
  },

  // MULTIPLE CHOICE QUESTIONS (26-35) - Select all that apply
  {
    question: "Which factors affect feed conversion efficiency in pigs? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "All these factors significantly impact how efficiently pigs convert feed into body weight gain.",
    options: [
      { text: "Genetics", is_correct: true },
      { text: "Feed quality", is_correct: true },
      { text: "Environmental temperature", is_correct: true },
      { text: "Health status", is_correct: true },
      { text: "Housing conditions", is_correct: true }
    ]
  },
  {
    question: "Which signs indicate heat stress in pigs? (Select all that apply)",
    type: "multi",
    difficulty: "easy",
    explanation: "These are classic signs of heat stress that require immediate attention to prevent serious health issues.",
    options: [
      { text: "Panting", is_correct: true },
      { text: "Reduced feed intake", is_correct: true },
      { text: "Increased water consumption", is_correct: true },
      { text: "Lethargy", is_correct: true },
      { text: "Increased aggression", is_correct: false }
    ]
  },
  {
    question: "Which biosecurity measures help prevent disease transmission? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "Comprehensive biosecurity requires multiple layers of protection to effectively prevent disease transmission.",
    options: [
      { text: "Visitor restrictions", is_correct: true },
      { text: "Proper disposal of dead animals", is_correct: true },
      { text: "Feed supplier verification", is_correct: true },
      { text: "Regular disinfection", is_correct: true },
      { text: "Staff training", is_correct: true }
    ]
  },
  {
    question: "Which nutrients are essential for proper bone development in pigs? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "These nutrients work together to ensure proper bone formation and strength in growing pigs.",
    options: [
      { text: "Calcium", is_correct: true },
      { text: "Phosphorus", is_correct: true },
      { text: "Vitamin D", is_correct: true },
      { text: "Protein", is_correct: true },
      { text: "Vitamin A", is_correct: false }
    ]
  },
  {
    question: "Which management practices can reduce piglet mortality? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "These practices address the main causes of piglet mortality in the first weeks of life.",
    options: [
      { text: "Cross-fostering", is_correct: true },
      { text: "Providing heat lamps", is_correct: true },
      { text: "Split suckling", is_correct: true },
      { text: "Iron injections", is_correct: true },
      { text: "Tail docking", is_correct: false }
    ]
  },
  {
    question: "Which environmental factors should be controlled in pig housing? (Select all that apply)",
    type: "multi",
    difficulty: "easy",
    explanation: "All these environmental factors significantly impact pig health, welfare, and performance.",
    options: [
      { text: "Temperature", is_correct: true },
      { text: "Humidity", is_correct: true },
      { text: "Air quality", is_correct: true },
      { text: "Lighting", is_correct: true },
      { text: "Noise levels", is_correct: true }
    ]
  },
  {
    question: "Which diseases require immediate reporting to veterinary authorities? (Select all that apply)",
    type: "multi",
    difficulty: "hard",
    explanation: "These are reportable diseases due to their serious economic and public health implications.",
    options: [
      { text: "African Swine Fever", is_correct: true },
      { text: "Classical Swine Fever", is_correct: true },
      { text: "Foot-and-Mouth Disease", is_correct: true },
      { text: "Common cold", is_correct: false },
      { text: "Pseudorabies", is_correct: true }
    ]
  },
  {
    question: "Which breeding methods are commonly used in commercial pig production? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "These breeding methods are practical and economical for commercial pig production operations.",
    options: [
      { text: "Natural mating", is_correct: true },
      { text: "Artificial insemination", is_correct: true },
      { text: "Embryo transfer", is_correct: true },
      { text: "Cloning", is_correct: false },
      { text: "Hand mating", is_correct: true }
    ]
  },
  {
    question: "Which feed ingredients are good sources of energy for pigs? (Select all that apply)",
    type: "multi",
    difficulty: "easy",
    explanation: "These ingredients provide readily available carbohydrates and fats for energy production.",
    options: [
      { text: "Corn", is_correct: true },
      { text: "Wheat", is_correct: true },
      { text: "Barley", is_correct: true },
      { text: "Soybean meal", is_correct: false },
      { text: "Fat/Oil", is_correct: true }
    ]
  },
  {
    question: "Which water quality parameters should be regularly monitored? (Select all that apply)",
    type: "multi",
    difficulty: "medium",
    explanation: "All these parameters affect pig health and performance and should be monitored regularly.",
    options: [
      { text: "pH level", is_correct: true },
      { text: "Bacterial count", is_correct: true },
      { text: "Nitrate levels", is_correct: true },
      { text: "Hardness", is_correct: true },
      { text: "Temperature", is_correct: true }
    ]
  },

  // TRUE/FALSE QUESTIONS (36-50)
  {
    question: "Pigs are naturally clean animals and will not soil their sleeping areas if given adequate space.",
    type: "truefalse",
    difficulty: "easy",
    explanation: "Pigs naturally prefer to keep their sleeping and eating areas separate from their elimination areas when space allows.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Sows should be fed the same diet throughout pregnancy and lactation.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Diet should be adjusted based on stage - gestation diet differs from lactation diet in energy and protein content.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Castration of male pigs eliminates boar taint in pork.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Castration prevents the development of compounds that cause boar taint, improving meat acceptability.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Pigs can synthesize Vitamin C in their bodies and do not require it in their diet.",
    type: "truefalse",
    difficulty: "hard",
    explanation: "Unlike humans, pigs can synthesize vitamin C internally and do not require dietary supplementation.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Group housing of pregnant sows is being phased out in favor of individual stalls.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "The trend is toward group housing systems that allow for more natural behavior and improved welfare.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Antibiotics used as growth promoters in pig feed are still widely approved in the United States.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Growth promotion use of antibiotics has been largely eliminated due to antibiotic resistance concerns.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Pigs have excellent eyesight but poor hearing compared to other farm animals.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Pigs actually have good hearing but relatively poor eyesight compared to other farm animals.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "The genetic potential for litter size in modern sows has increased significantly over the past 30 years.",
    type: "truefalse",
    difficulty: "easy",
    explanation: "Genetic selection has dramatically improved litter size and sow productivity over the past decades.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Pigs can be successfully raised on pasture systems without any supplemental feeding.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Even in pasture systems, pigs typically require supplemental feeding to meet nutritional requirements and growth targets.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Split-sex feeding (feeding barrows and gilts separately) can improve feed efficiency.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Barrows and gilts have different nutritional requirements, so separate feeding can optimize feed conversion.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Zinc oxide is commonly added to nursery pig diets to prevent diarrhea.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Zinc oxide is effective in preventing post-weaning diarrhea and supporting intestinal health in young pigs.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Pigs require the same amount of water per pound of body weight as cattle.",
    type: "truefalse",
    difficulty: "hard",
    explanation: "Pigs typically require more water per pound of body weight than cattle due to their higher metabolic rate.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Tail biting in pigs is always caused by overcrowding.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "Tail biting has multiple causes including nutrition, environment, stress, and genetics - not just overcrowding.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  },
  {
    question: "Gilt offspring typically have smaller litters than sow offspring in their first parity.",
    type: "truefalse",
    difficulty: "hard",
    explanation: "First-parity gilts typically have smaller litters than mature sows due to their developing reproductive capacity.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false }
    ]
  },
  {
    question: "Modern pig production systems have completely eliminated the need for outdoor access.",
    type: "truefalse",
    difficulty: "medium",
    explanation: "While indoor systems are common, outdoor access systems still exist and welfare concerns continue to be debated.",
    options: [
      { text: "True", is_correct: false },
      { text: "False", is_correct: true }
    ]
  }
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Find or create admin user
    let adminUser = await User.findOne({ where: { email: "admin@farmconnect.com" } });
    if (!adminUser) {
      // First, ensure we have the required role and level
      const adminRole = await Role.findOne({ where: { name: "admin" } });
      const level = await Level.findOne({ where: { id: 1 } });
      
      if (!adminRole || !level) {
        throw new Error("Required admin role or level not found. Please run seeders first.");
      }

      adminUser = await User.create({
        firstname: "Admin",
        lastname: "User",
        email: "admin@farmconnect.com",
        username: "admin",
        password: "dummy_hash", // This should be properly hashed in real scenario
        role_id: adminRole.id,
        level_id: level.id,
        is_verified: true
      });
      console.log("✅ Created admin user for quiz creation");
    }

    // Find or create Pig Farming best practice tag
    let pigFarmingTag = await BestPracticeTag.findOne({ 
      where: { name: "Pig Farming" } 
    });
    if (!pigFarmingTag) {
      pigFarmingTag = await BestPracticeTag.create({
        name: "Pig Farming",
        description: "Comprehensive pig farming practices, nutrition, health management, and production systems",
        is_active: true
      });
      console.log("✅ Created Pig Farming tag");
    }

    // Check if quiz already exists
    let existingQuiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" }
    });

    if (existingQuiz) {
      console.log("⚠️ Comprehensive Pig Farming Quiz already exists. Skipping creation.");
      await sequelize.close();
      return;
    }

    // Create the quiz
    const quiz = await Quiz.create({
      title: "Comprehensive Pig Farming Quiz",
      description: "A comprehensive 50-question quiz covering all aspects of pig farming including nutrition, breeding, health management, housing, and production systems. Designed for farmers, students, and agricultural professionals.",
      duration: 60, // 60 minutes
      passing_score: 70, // 70% passing score
      is_active: true,
      best_practice_tag_id: pigFarmingTag.id,
      created_by: adminUser.id
    });

    console.log(`✅ Created quiz: ${quiz.title} (ID: ${quiz.id})`);

    let questionsCreated = 0;
    let optionsCreated = 0;

    // Create questions and options
    for (let i = 0; i < quizData.length; i++) {
      const questionData = quizData[i];
      
      const question = await QuizQuestion.create({
        quiz_id: quiz.id,
        text: questionData.question,
        explanation: questionData.explanation || null,
        order_index: i + 1,
        type: questionData.type,
        difficulty: questionData.difficulty,
        is_active: true,
        is_deleted: false
      });

      questionsCreated++;

      // Create options for this question
      for (let j = 0; j < questionData.options.length; j++) {
        const option = questionData.options[j];
        
        await QuizQuestionOption.create({
          question_id: question.id,
          text: option.text,
          is_correct: option.is_correct,
          order_index: j,
          is_deleted: false
        });

        optionsCreated++;
      }

      console.log(`✅ Created question ${i + 1}: ${questionData.type} with ${questionData.options.length} options`);
    }

    console.log("\n🎉 Quiz population completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Quiz: ${quiz.title}`);
    console.log(`   - Questions created: ${questionsCreated}`);
    console.log(`   - Options created: ${optionsCreated}`);
    console.log(`   - Single choice questions: 25 (Questions 1-25)`);
    console.log(`   - Multiple choice questions: 10 (Questions 26-35)`);
    console.log(`   - True/false questions: 15 (Questions 36-50)`);
    console.log(`   - Duration: ${quiz.duration} minutes`);
    console.log(`   - Passing score: ${quiz.passing_score}%`);

    await sequelize.close();
    console.log("✅ Database connection closed");
    
  } catch (error) {
    console.error("❌ Error populating quiz:", error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  run();
}

export default run;
