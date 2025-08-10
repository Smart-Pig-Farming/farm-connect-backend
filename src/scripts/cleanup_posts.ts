import dotenv from "dotenv";
import sequelize from "../config/database";
import DiscussionPost from "../models/DiscussionPost";

dotenv.config();

async function cleanup() {
  try {
    await sequelize.authenticate();

    const titlesToDelete = [
      "Best feeding practices for weaned piglets",
      "Quality pig feed supplier needed in Musanze",
      "Modern pig housing designs that work in Rwanda",
      "Vaccination schedule for commercial pig farms",
      "Breeding boars for sale - Landrace x Yorkshire",
      "Managing heat stress in pigs during dry season",
      "Pig farming equipment auction - Huye District",
      "Profitable pig breeds for Rwandan climate",
      "Organic pig feed ingredients sourced locally",
      "Pregnant sows for sale - Due in 3 weeks",
      "Biosecurity measures for small pig farms",
      "Pig manure management and composting tips",
      "Mobile pig slaughter services in Eastern Province",
      "Water quality and consumption for pigs",
      "Pig farming training workshop - Kigali",
      "Piglet starter feed - high quality, competitive prices",
      "Record keeping systems for pig farms",
      "Emergency veterinary services - Northern Province",
      "Pig weight estimation without scales",
      "Seasonal pricing trends for live pigs",
    ];

    const deleted = await DiscussionPost.destroy({
      where: { title: titlesToDelete },
    });

    console.log(`Deleted ${deleted} posts`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

cleanup();
