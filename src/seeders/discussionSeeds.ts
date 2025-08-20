import sequelize from "../config/database";
import "../models"; // ensure associations are loaded
import User from "../models/User";
import Role from "../models/Role";
import Level from "../models/Level";
import DiscussionPost from "../models/DiscussionPost";
import Tag from "../models/Tag";
import PostMedia from "../models/PostMedia";

type MockAuthor = {
  id: string; // frontend uses string ids like "user1"; we'll map to Users by email/username
  firstname: string;
  lastname: string;
  avatar: string | null;
  level_id: number;
  points: number;
  location: string;
};

type MockPost = {
  id: string;
  title: string;
  content: string;
  author: MockAuthor;
  tags: string[];
  upvotes: number;
  downvotes: number;
  replies: number;
  shares: number;
  isMarketPost: boolean;
  isAvailable: boolean;
  createdAt: string; // relative text, we’ll convert to recent timestamps
  images: string[];
  video: string | null;
  isModeratorApproved?: boolean;
};

function mapRelativeTimeToDate(relative: string): Date {
  const now = new Date();
  const val = relative.toLowerCase();
  try {
    if (val.includes("m")) {
      const minutes = parseInt(val);
      return new Date(now.getTime() - minutes * 60_000);
    }
    if (val.includes("h")) {
      const hours = parseInt(val);
      return new Date(now.getTime() - hours * 3_600_000);
    }
    if (val.includes("d")) {
      const days = parseInt(val);
      return new Date(now.getTime() - days * 86_400_000);
    }
  } catch {}
  return now;
}

async function ensureRoleAndLevel(): Promise<{
  roleId: number;
  levelId: number;
}> {
  const [role] = await Role.findOrCreate({
    where: { name: "farmer" },
    defaults: { name: "farmer", description: "Farmer user" },
  });
  const [level] = await Level.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      name: "Beginner",
      description: "New users",
      min_points: 0,
      max_points: 100,
    },
  });
  return { roleId: role.id, levelId: level.id };
}

async function ensureUser(
  author: MockAuthor,
  defaults: { roleId: number; levelId: number }
): Promise<User> {
  const baseUsername = `${author.firstname}.${author.lastname}`
    .toLowerCase()
    .replace(/\s+/g, "");
  const email = `${baseUsername}@example.com`;
  const [user] = await User.findOrCreate({
    where: { email },
    defaults: {
      firstname: author.firstname,
      lastname: author.lastname,
      email,
      username: baseUsername,
      password: "$2a$10$abcdefghijklmnopqrstuv", // placeholder hash
      role_id: defaults.roleId,
      level_id: defaults.levelId,
      points: author.points ?? 0,
      district: author.location,
      is_verified: true,
      is_locked: false,
    },
  });
  return user;
}

async function ensureTags(tagNames: string[]): Promise<Tag[]> {
  const results: Tag[] = [];
  for (const name of tagNames) {
    const [tag] = await Tag.findOrCreate({
      where: { name },
      defaults: { name, color: "blue" },
    });
    results.push(tag);
  }
  return results;
}

export async function seedDiscussionPostsFromMocks(
  posts: MockPost[]
): Promise<void> {
  const tx = await sequelize.transaction();
  try {
    const { roleId, levelId } = await ensureRoleAndLevel();

    for (const p of posts) {
      const user = await ensureUser(p.author, { roleId, levelId });
      const createdAt = mapRelativeTimeToDate(p.createdAt);
      const post = await DiscussionPost.create(
        {
          title: p.title,
          content: p.content,
          author_id: user.id,
          upvotes: p.upvotes ?? 0,
          downvotes: p.downvotes ?? 0,
          is_market_post: !!p.isMarketPost,
          is_available: p.isMarketPost ? !!p.isAvailable : false,
          is_approved: p.isModeratorApproved ?? true,
          created_at: createdAt,
          updated_at: createdAt,
        },
        { transaction: tx }
      );

      // Tags
      const tags = await ensureTags(p.tags || []);
      if (tags.length) {
        await (post as any).setTags(tags, { transaction: tx });
      }

      // Media
      const images = p.images || [];
      for (let i = 0; i < images.length; i++) {
        await PostMedia.create(
          {
            post_id: post.id,
            media_type: "image",
            storage_key: images[i], // use path as storage key for demo
            file_name: images[i].split("/").pop() || `image-${i}.jpg`,
            file_size: 0,
            mime_type: "image/jpeg",
            display_order: i,
            status: "ready",
          },
          { transaction: tx }
        );
      }

      if (p.video) {
        await PostMedia.create(
          {
            post_id: post.id,
            media_type: "video",
            storage_key: p.video,
            file_name: p.video.split("/").pop() || "video.mp4",
            file_size: 0,
            mime_type: "video/mp4",
            display_order: images.length,
            status: "ready",
          },
          { transaction: tx }
        );
      }
    }

    await tx.commit();
    console.log(`Seeded ${posts.length} discussion posts`);
  } catch (err) {
    await tx.rollback();
    console.error("Error seeding discussion posts:", err);
    throw err;
  }
}
