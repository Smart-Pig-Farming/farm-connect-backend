import sequelize from "../config/database";
import "../models";
import DiscussionPost from "../models/DiscussionPost";

async function main() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");
    const [updated] = await DiscussionPost.update(
      { is_approved: true, approved_at: new Date() },
      { where: {}, returning: false }
    );
    console.log(`Approved posts updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error("Approve all posts error:", err);
    process.exit(1);
  }
}

main();
