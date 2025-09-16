import sequelize from "../config/database";
import BestPracticeTag from "../models/BestPracticeTag";

const BEST_PRACTICE_TAGS = [
  {
    name: "Pig Farming",
    description: "General pig farming practices and management techniques",
    is_active: true,
  },
  {
    name: "Environment Management",
    description:
      "Environmental controls, housing, and sustainability practices",
    is_active: true,
  },
  {
    name: "Nutrition",
    description:
      "Feed management, dietary requirements, and nutrition optimization",
    is_active: true,
  },
  {
    name: "Health Management",
    description: "Disease prevention, veterinary care, and health monitoring",
    is_active: true,
  },
  {
    name: "Breeding",
    description: "Reproductive management, genetics, and breeding strategies",
    is_active: true,
  },
  {
    name: "Biosecurity",
    description: "Disease prevention, quarantine protocols, and farm security",
    is_active: true,
  },
  {
    name: "Technology",
    description: "Precision farming tools, automation, and digital solutions",
    is_active: true,
  },
  {
    name: "Economics",
    description: "Financial management, cost optimization, and market analysis",
    is_active: true,
  },
];

async function populateBestPracticeTags() {
  try {
    console.log("🏷️  Starting Best Practice Tags population...");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Check if tags already exist
    const existingCount = await BestPracticeTag.count();
    if (existingCount > 0) {
      console.log(
        `⚠️  Found ${existingCount} existing tags. Skipping creation to avoid duplicates.`
      );
      console.log(
        "💡 If you need to recreate tags, first run clearAllQuizData.ts to remove foreign key dependencies"
      );

      // Show existing tags
      const existingTags = await BestPracticeTag.findAll();
      console.log("\n🏷️  Existing tags:");
      existingTags.forEach((tag: any, index: number) => {
        console.log(`   ${index + 1}. ${tag.name}`);
      });
      return;
    }

    console.log("📝 Creating best practice tags...");

    // Create all tags
    const createdTags = await BestPracticeTag.bulkCreate(BEST_PRACTICE_TAGS);

    console.log("\n🎉 Best Practice Tags created successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • Total tags created: ${createdTags.length}`);
    console.log("\n🏷️  Created tags:");

    createdTags.forEach((tag: any, index: number) => {
      console.log(`   ${index + 1}. ${tag.name}`);
    });

    console.log("\n✅ Best Practice Tags population completed!");
    console.log("💡 Next step: Run quiz population scripts");
  } catch (error) {
    console.error("❌ Error populating best practice tags:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }

    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  populateBestPracticeTags();
}

export { populateBestPracticeTags };
