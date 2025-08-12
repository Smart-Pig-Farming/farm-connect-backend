import sequelize from "../config/database";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import User from "../models/User";
import discussionController from "../controllers/discussionController";

// Minimal mock for Express req/res
function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.jsonBody = null as any;
  res.json = (body: any) => {
    res.jsonBody = body;
    return res;
  };
  return res;
}

async function main() {
  try {
    await sequelize.authenticate();

    // Pick a post
    const post = await DiscussionPost.findOne({
      where: { is_deleted: false },
      order: [["created_at", "DESC"]],
    });
    if (!post) {
      console.log("No posts found to verify.");
      return;
    }

    // Pick a user
    const user = await User.findOne({});
    if (!user) {
      console.log("No user found to author the test reply.");
      return;
    }

    // Read initial via controller.getPosts
    const reqListBefore: any = { query: { page: "1", limit: "5" } };
    const resListBefore = mockRes();
    await discussionController.getPosts(reqListBefore, resListBefore);
    const listBefore = resListBefore.jsonBody?.data?.posts || [];
    const beforeItem = listBefore.find((p: any) => p.id === post.id) || {};
    console.log("Before: replies=", beforeItem.replies, "postId=", post.id);

    // Create a test reply directly and increment replies_count
    const reply = await DiscussionReply.create({
      content: "[verifier] test reply",
      post_id: post.id,
      author_id: (user as any).id,
      parent_reply_id: null,
      depth: 0,
    });
    await DiscussionPost.increment(
      { replies_count: 1 },
      { where: { id: post.id } }
    );

    // Read after via controller.getPosts
    const reqListAfter: any = { query: { page: "1", limit: "5" } };
    const resListAfter = mockRes();
    await discussionController.getPosts(reqListAfter, resListAfter);
    const listAfter = resListAfter.jsonBody?.data?.posts || [];
    const afterItem = listAfter.find((p: any) => p.id === post.id) || {};
    console.log("After: replies=", afterItem.replies, "(should be before+1)");

    // Verify getReplies author fields
    const reqReplies: any = {
      params: { id: post.id },
      query: { page: "1", limit: "10" },
    };
    const resReplies = mockRes();
    await discussionController.getReplies(reqReplies, resReplies);
    const replies = resReplies.jsonBody?.data?.replies || [];
    const top = replies[0];
    console.log("Sample reply author:", top?.author);

    // Clean up the test reply (optional)
    await reply.destroy();
    await DiscussionPost.increment(
      { replies_count: -1 },
      { where: { id: post.id } }
    );
  } catch (err) {
    console.error("Verifier error:", err);
  } finally {
    await sequelize.close();
  }
}

main();
