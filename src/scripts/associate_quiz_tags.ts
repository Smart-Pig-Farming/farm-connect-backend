import "../models";
import sequelize from "../config/database";
import BestPracticeTag from "../models/BestPracticeTag";
import QuizTagAssignment from "../models/QuizTagAssignment";
import Quiz from "../models/Quiz";

async function associateQuizTags() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Get the pig farming quiz
    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (!quiz) {
      console.log("❌ Quiz not found");
      process.exit(1);
    }

    // Get relevant tag IDs
    const relevantTags = await BestPracticeTag.findAll({
      where: {
        name: [
          "Feeding & Nutrition",
          "Disease Control",
          "Growth & Weight Mgmt",
          "Environment Mgmt",
          "Breeding & Insemination",
          "Farrowing Mgmt",
        ],
      },
    });

    console.log(`Quiz ID: ${quiz.id}`);
    console.log("Relevant tags found:");
    relevantTags.forEach((tag) => {
      console.log(`  ${tag.id}: ${tag.name}`);
    });

    // Create tag assignments for all relevant categories
    for (const tag of relevantTags) {
      const [assignment, created] = await QuizTagAssignment.findOrCreate({
        where: {
          quiz_id: quiz.id,
          tag_id: tag.id,
        },
        defaults: {
          quiz_id: quiz.id,
          tag_id: tag.id,
        },
      });

      if (created) {
        console.log(`✅ Associated quiz with ${tag.name} (ID: ${tag.id})`);
      } else {
        console.log(
          `ℹ️  Quiz already associated with ${tag.name} (ID: ${tag.id})`
        );
      }
    }

    console.log("✅ Quiz now associated with all relevant categories!");

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await sequelize.close();
    process.exit(1);
  }
}

associateQuizTags();
