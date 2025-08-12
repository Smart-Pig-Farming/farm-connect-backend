import dotenv from "dotenv";
import sequelize from "../config/database";
import DiscussionPost from "../models/DiscussionPost";

dotenv.config();

async function checkPosts() {
  try {
    await sequelize.authenticate();
    const count = await DiscussionPost.count();
    console.log(`Current posts count: ${count}`);

    const posts = await DiscussionPost.findAll({
      attributes: ["id", "title"],
      order: [["created_at", "DESC"]],
      limit: 5,
    });

    console.log("Latest posts:");
    posts.forEach((post) => console.log(`  ${post.title}`));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkPosts();
