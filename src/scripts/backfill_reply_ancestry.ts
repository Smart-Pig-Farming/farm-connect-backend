import ReplyAncestry from "../models/ReplyAncestry";
import DiscussionReply from "../models/DiscussionReply";
import DiscussionPost from "../models/DiscussionPost";
import sequelize from "../config/database";

async function run() {
  console.log("Starting reply ancestry backfill...");
  const replies = await DiscussionReply.findAll({
    order: [["created_at", "ASC"]],
  });
  let created = 0;
  for (const r of replies as any[]) {
    const existing = await ReplyAncestry.findOne({ where: { reply_id: r.id } });
    if (existing) continue;
    // derive lineage
    let parent_id = r.parent_reply_id || null;
    let grandparent_id: string | null = null;
    if (parent_id) {
      const parent = await DiscussionReply.findByPk(parent_id);
      if (parent?.parent_reply_id) grandparent_id = parent.parent_reply_id;
    }
    const root_post_id = r.post_id;
    await ReplyAncestry.create({
      reply_id: r.id,
      parent_id,
      grandparent_id,
      root_post_id,
    });
    created++;
  }
  console.log(`Backfill complete. Created ${created} ancestry rows.`);
  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
