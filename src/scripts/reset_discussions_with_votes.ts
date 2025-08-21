import dotenv from "dotenv";
import sequelize from "../config/database";
import "../models";
import DiscussionPost from "../models/DiscussionPost";
import DiscussionReply from "../models/DiscussionReply";
import User from "../models/User";
import UserVote from "../models/UserVote";
import { v4 as uuid } from "uuid";

/*
 * Script: reset_discussions_with_votes
 * Purpose: Wipes existing discussion posts (optionally limited) and seeds a fresh set
 *          where vote counts are materialized as individual user_votes rows so that
 *          counts reflect real voters (not synthetic integers).
 * SAFE MODE: By default only deletes posts authored by the seed bot titles list unless --all provided.
 * Usage: npx ts-node src/scripts/reset_discussions_with_votes.ts [--all]
 */

dotenv.config();

interface SeedPostSpec {
  title: string;
  content: string;
  tags?: string[];
  upvoters: string[]; // user usernames
  downvoters?: string[];
  is_market_post?: boolean;
  is_available?: boolean;
}

const SEED_USERS: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}[] = [
  {
    username: "john_farmer",
    firstname: "John",
    lastname: "Farmer",
    email: "john_farmer@example.com",
  },
  {
    username: "sarah_expert",
    firstname: "Sarah",
    lastname: "Expert",
    email: "sarah_expert@example.com",
  },
  {
    username: "paul_breeder",
    firstname: "Paul",
    lastname: "Breeder",
    email: "paul_breeder@example.com",
  },
  {
    username: "amina_vet",
    firstname: "Amina",
    lastname: "Vet",
    email: "amina_vet@example.com",
  },
  {
    username: "claire_feed",
    firstname: "Claire",
    lastname: "Feed",
    email: "claire_feed@example.com",
  },
  {
    username: "henry_housing",
    firstname: "Henry",
    lastname: "Housing",
    email: "henry_housing@example.com",
  },
];

const POSTS: SeedPostSpec[] = [
  {
    title: "Optimizing Sow Nutrition During Gestation",
    content:
      "Sharing a structured plan for feeding sows by trimester. Looking for feedback on mineral balancing strategies.",
    tags: ["Feed", "Breeding"],
    upvoters: ["john_farmer", "sarah_expert", "paul_breeder", "amina_vet"],
    downvoters: ["claire_feed"],
  },
  {
    title: "Biosecurity Checklist Validation",
    content:
      "Compiled a 15-point on-farm biosecurity checklist. Which items do you think are overkill for a 120-head unit?",
    tags: ["Health", "Biosecurity"],
    upvoters: [
      "sarah_expert",
      "john_farmer",
      "amina_vet",
      "claire_feed",
      "henry_housing",
    ],
  },
  {
    title: "Local Feed Ingredient Cost Comparison Q1",
    content:
      "Collected pricing for maize bran, soybean meal, fish meal across three districts. Posting summary for discussion.",
    tags: ["Market", "Feed"],
    upvoters: ["claire_feed", "john_farmer", "paul_breeder"],
    downvoters: [],
    is_market_post: true,
    is_available: true,
  },
];

async function ensureUsers() {
  const existingUsers = await User.findAll({
    where: { username: SEED_USERS.map((u) => u.username) },
  });
  const existingMap = new Map(existingUsers.map((u) => [u.username, u]));
  const created: User[] = [];
  for (const u of SEED_USERS) {
    if (!existingMap.has(u.username)) {
      const user = await User.create({
        username: u.username,
        firstname: u.firstname,
        lastname: u.lastname,
        email: u.email,
        password: "temp-hash", // placeholder hash
        is_verified: true,
        level_id: 1,
        role_id: 1,
      } as any);
      created.push(user);
      existingMap.set(u.username, user);
    }
  }
  return existingMap; // username -> user instance
}

async function reset(all: boolean) {
  await sequelize.authenticate();
  console.log("[reset] DB connected");
  const userMap = await ensureUsers();

  // Delete existing seed posts (safe mode) or all posts
  if (all) {
    console.log(
      "[reset] Deleting ALL discussion posts (cascade replies & votes)"
    );
    await UserVote.destroy({ where: {} });
    await DiscussionReply.destroy({ where: {} });
    await DiscussionPost.destroy({ where: {} });
  } else {
    const titles = POSTS.map((p) => p.title);
    console.log("[reset] Deleting only posts with matching seed titles");
    const posts = await DiscussionPost.findAll({ where: { title: titles } });
    const postIds = posts.map((p) => p.id);
    if (postIds.length) {
      await UserVote.destroy({
        where: { target_type: "post", target_id: postIds as any } as any,
      });
      await DiscussionReply.destroy({
        where: { post_id: postIds as any } as any,
      });
      await DiscussionPost.destroy({ where: { id: postIds as any } as any });
    }
  }

  for (const spec of POSTS) {
    const author =
      userMap.get(spec.upvoters[0]) || Array.from(userMap.values())[0];
    const post = await DiscussionPost.create({
      title: spec.title,
      content: spec.content,
      author_id: (author as any).id,
      is_deleted: false,
      is_market_post: !!spec.is_market_post,
      is_available: spec.is_available ?? false,
      upvotes: 0,
      downvotes: 0,
    } as any);

    // Attach votes as individual rows & maintain counters
    const seen = new Set<string>();
    for (const voter of spec.upvoters) {
      if (!userMap.has(voter) || seen.has(voter)) continue;
      const u = userMap.get(voter)!;
      await UserVote.create({
        user_id: (u as any).id,
        target_type: "post",
        target_id: post.id,
        vote_type: "upvote",
      } as any);
      post.upvotes += 1;
      seen.add(voter);
    }
    for (const voter of spec.downvoters || []) {
      if (!userMap.has(voter) || seen.has(voter)) continue;
      const u = userMap.get(voter)!;
      await UserVote.create({
        user_id: (u as any).id,
        target_type: "post",
        target_id: post.id,
        vote_type: "downvote",
      } as any);
      post.downvotes += 1;
      seen.add(voter);
    }
    await post.save();
    console.log(
      `[seed] Post '${spec.title}' => up:${post.upvotes} down:${post.downvotes}`
    );
  }

  console.log("[reset] Completed");
}

(async () => {
  const all = process.argv.includes("--all");
  try {
    await reset(all);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
