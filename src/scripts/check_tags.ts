import dotenv from "dotenv";
import sequelize from "../config/database";
import Tag from "../models/Tag";

dotenv.config();

async function checkTags() {
  try {
    await sequelize.authenticate();
    const tags = await Tag.findAll({ order: [["name", "ASC"]] });
    console.log("Available tags:");
    tags.forEach((tag) =>
      console.log(`  ${tag.id}: ${tag.name} (${tag.color})`)
    );
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTags();
