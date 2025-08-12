import { seedDiscussionPostsFromMocks } from "../seeders/discussionSeeds";
import sequelize from "../config/database";
import "../models"; // load associations

async function main() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    // Inline a curated subset of the frontend mocks for seeding
    const posts = [
      {
        id: "1",
        title: "Best Pig Feed Suppliers in Kigali",
        content:
          "I'm looking for reliable feed suppliers who can deliver quality feed for 50+ pigs. Budget is around 500,000 RWF per month.",
        author: {
          id: "user1",
          firstname: "John",
          lastname: "Farmer",
          avatar: null,
          level_id: 2,
          points: 245,
          location: "Kigali, Rwanda",
        },
        tags: ["Market", "Feed"],
        upvotes: 24,
        downvotes: 2,
        replies: 7,
        shares: 3,
        isMarketPost: true,
        isAvailable: true,
        createdAt: "5m ago",
        images: ["/images/post_image.jpg", "/images/post_image2.jpg"],
        video: null,
        isModeratorApproved: true,
      },
      {
        id: "2",
        title: "Disease Prevention Tips for Young Pigs",
        content:
          "What are the most effective vaccination schedules and health monitoring practices for piglets under 3 months?",
        author: {
          id: "user2",
          firstname: "Sarah",
          lastname: "Expert",
          avatar: null,
          level_id: 3,
          points: 890,
          location: "Musanze, Rwanda",
        },
        tags: ["Health", "General"],
        upvotes: 45,
        downvotes: 1,
        replies: 0,
        shares: 8,
        isMarketPost: false,
        isAvailable: false,
        createdAt: "45m ago",
        images: [],
        video: "/images/post_video.mp4",
        isModeratorApproved: true,
      },
    ];

    await seedDiscussionPostsFromMocks(posts as any);
    console.log("Discussion posts seed completed");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

main();
