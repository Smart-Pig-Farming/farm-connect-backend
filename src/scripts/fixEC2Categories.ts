/**
 * Script to fix missing categories and quiz assignment on EC2
 */

import sequelize from "../config/database";
import Quiz from "../models/Quiz";
import BestPracticeTag from "../models/BestPracticeTag";

async function fixEC2Categories() {
  try {
    await sequelize.authenticate();
    console.log("🔧 Fixing categories and quiz assignment on EC2...\n");

    // 1. Create missing categories
    console.log("📝 Creating missing best practice categories...");

    const categories = [
      {
        name: "Feeding & Nutrition",
        description: "Best practices for pig feeding and nutrition management",
      },
      {
        name: "Disease Control",
        description: "Disease prevention and control measures",
      },
      {
        name: "Growth & Weight Mgmt",
        description: "Growth monitoring and weight management practices",
      },
      {
        name: "Environment Mgmt",
        description: "Environmental management and housing practices",
      },
      {
        name: "Breeding & Insemination",
        description: "Breeding and artificial insemination practices",
      },
      {
        name: "Farrowing Mgmt",
        description: "Farrowing management and piglet care",
      },
      {
        name: "Record & Farm Mgmt",
        description: "Record keeping and farm management practices",
      },
      {
        name: "Marketing & Finance",
        description: "Marketing strategies and financial management",
      },
    ];

    for (const category of categories) {
      const [tag, created] = await BestPracticeTag.findOrCreate({
        where: { name: category.name },
        defaults: {
          name: category.name,
          description: category.description,
          is_active: true,
        },
      });

      if (created) {
        console.log(`✅ Created: ${tag.name} (ID: ${tag.id})`);
      } else {
        console.log(`📄 Exists: ${tag.name} (ID: ${tag.id})`);
      }
    }

    // 2. Find Environment Mgmt category
    console.log("\n🔍 Finding Environment Mgmt category...");
    const envCategory = await BestPracticeTag.findOne({
      where: { name: "Environment Mgmt" },
    });

    if (!envCategory) {
      throw new Error("Environment Mgmt category not found after creation!");
    }

    console.log(`✅ Environment Mgmt found with ID: ${envCategory.id}`);

    // 3. Update quiz to use Environment Mgmt category
    console.log("\n🎯 Updating Comprehensive Quiz category...");
    const quiz = await Quiz.findOne({
      where: { title: "Comprehensive Pig Farming Quiz" },
    });

    if (!quiz) {
      throw new Error("Comprehensive Pig Farming Quiz not found!");
    }

    console.log(`📋 Found quiz: ${quiz.title} (ID: ${quiz.id})`);
    console.log(`🏷️  Current category ID: ${quiz.best_practice_tag_id}`);

    // Update the quiz category
    await quiz.update({
      best_practice_tag_id: envCategory.id,
    });

    console.log(
      `✅ Updated quiz category to: Environment Mgmt (ID: ${envCategory.id})`
    );

    // 4. Verify the changes
    console.log("\n🔍 Verification:");
    console.log("══════════════════════════════════════════════════");

    const updatedQuiz = await Quiz.findByPk(quiz.id);
    const category = await BestPracticeTag.findByPk(
      updatedQuiz!.best_practice_tag_id
    );

    console.log(`Quiz: ${updatedQuiz!.title}`);
    console.log(`Category: ${category!.name} (ID: ${category!.id})`);
    console.log(`Active: ${updatedQuiz!.is_active}`);

    // 5. Check all categories now available
    console.log("\n📊 ALL CATEGORIES NOW AVAILABLE:");
    console.log("══════════════════════════════════════════════════");
    const allCategories = await BestPracticeTag.findAll({
      order: [["name", "ASC"]],
    });

    allCategories.forEach((cat) => {
      console.log(`- ${cat.name} (ID: ${cat.id}) - Active: ${cat.is_active}`);
    });

    console.log(
      "\n🎉 SUCCESS! Quiz should now appear in Environment Mgmt section!"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

fixEC2Categories();
