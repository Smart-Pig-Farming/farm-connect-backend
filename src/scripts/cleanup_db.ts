import sequelize from "../config/database";
import "../models"; // ensure associations
import User from "../models/User";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import PostMedia from "../models/PostMedia";
import UserVote from "../models/UserVote";
import ContentReport from "../models/ContentReport";
import { Op } from "sequelize";

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log("DB connected for cleanup");

    // Keep only the configured admin user
    const adminEmail = process.env.ADMIN_EMAIL || "piggydata25@gmail.com";

    // Delete posts/media/replies authored by users that will be removed
    const usersToDelete = await User.findAll({
      where: { email: { [Op.ne]: adminEmail } },
      attributes: ["id"],
    });
    const userIds = usersToDelete.map((u) => u.id);

    if (userIds.length) {
      console.log(`Removing data for ${userIds.length} non-admin users...`);
      const tx = await sequelize.transaction();
      try {
        // Collect posts authored by these users
        const posts = await DiscussionPost.findAll({
          where: { author_id: { [Op.in]: userIds } },
          attributes: ["id"],
          transaction: tx,
        });
        const postIds = posts.map((p) => p.id);

        // Replies authored by users OR belonging to those posts
        const replyWhere: any = {
          [Op.or]: [{ author_id: { [Op.in]: userIds } }],
        };
        if (postIds.length) {
          replyWhere[Op.or].push({ post_id: { [Op.in]: postIds } });
        }
        const replies = await DiscussionReply.findAll({
          where: replyWhere,
          attributes: ["id"],
          transaction: tx,
        });
        const replyIds = replies.map((r) => r.id);

        // Delete user votes referencing those posts/replies
        if (postIds.length) {
          await UserVote.destroy({
            where: { target_type: "post", target_id: { [Op.in]: postIds } },
            transaction: tx,
          });
        }
        if (replyIds.length) {
          await UserVote.destroy({
            where: { target_type: "reply", target_id: { [Op.in]: replyIds } },
            transaction: tx,
          });
        }

        // Delete content reports referencing those posts or replies (via content_id/content_type)
        if (postIds.length) {
          await ContentReport.destroy({
            where: { content_type: "post", content_id: { [Op.in]: postIds } },
            transaction: tx,
          });
        }
        if (replyIds.length) {
          await ContentReport.destroy({
            where: { content_type: "reply", content_id: { [Op.in]: replyIds } },
            transaction: tx,
          });
        }

        // Media for posts
        if (postIds.length) {
          await PostMedia.destroy({
            where: { post_id: { [Op.in]: postIds } },
            transaction: tx,
          });
        }
        // Replies then posts
        if (replyIds.length) {
          await DiscussionReply.destroy({
            where: { id: { [Op.in]: replyIds } },
            transaction: tx,
          });
        }
        if (postIds.length) {
          await DiscussionPost.destroy({
            where: { id: { [Op.in]: postIds } },
            transaction: tx,
          });
        }
        // Finally users
        await User.destroy({ where: { id: userIds }, transaction: tx });

        await tx.commit();
        console.log("Removed non-admin users and their discussion data");
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } else {
      console.log("No non-admin users found to delete");
    }

    console.log("Cleanup completed");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanup();
