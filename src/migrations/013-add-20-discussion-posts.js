"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { v4: uuidv4 } = require("uuid");

    // Post data with realistic pig farming content
    const posts = [
      {
        id: uuidv4(),
        title: "Best feeding practices for weaned piglets",
        content:
          "What are your experiences with transitioning piglets from mother's milk to solid feed? I've been having some challenges with post-weaning diarrhea and would love to hear what feeding strategies have worked for you.",
        author_id: 2, // John Keller
        upvotes: 23,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Quality pig feed supplier needed in Musanze",
        content:
          "Looking for reliable feed suppliers in the Northern Province. I need consistent quality for my 80-pig operation. Budget is around 800,000 RWF monthly. Please contact if you can deliver quality feeds.",
        author_id: 3, // Sally Ulrich
        upvotes: 15,
        downvotes: 0,
        is_market_post: true,
        is_available: true,
        is_approved: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Modern pig housing designs that work in Rwanda",
        content:
          "I'm expanding my farm and need advice on housing designs that work well in our climate. Looking for cost-effective but efficient designs that can house 50+ pigs. Any recommendations?",
        author_id: 4, // Ethel Bassey
        upvotes: 31,
        downvotes: 2,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Vaccination schedule for commercial pig farms",
        content:
          "What vaccination protocols do you follow for your commercial operations? I'm particularly interested in preventing Classical Swine Fever and other common diseases in Rwanda.",
        author_id: 7, // Sarah Expert
        upvotes: 67,
        downvotes: 3,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Breeding boars for sale - Landrace x Yorkshire",
        content:
          "I have 3 high-quality breeding boars available. They are 8-10 months old, healthy, and from excellent bloodlines. Located in Kigali. Price: 180,000 RWF each or best offer.",
        author_id: 6, // John Farmer
        upvotes: 12,
        downvotes: 1,
        is_market_post: true,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Managing heat stress in pigs during dry season",
        content:
          "The dry season is approaching and I'm concerned about heat stress in my pigs. What cooling methods have you found most effective and affordable for small to medium farms?",
        author_id: 5, // Jean De Dieu Alvirisi
        upvotes: 28,
        downvotes: 0,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Pig farming equipment auction - Huye District",
        content:
          "Due to farm relocation, I'm selling various pig farming equipment including feeders, waterers, and housing materials. Auction will be held this Saturday. Serious buyers only.",
        author_id: 2, // John Keller
        upvotes: 8,
        downvotes: 0,
        is_market_post: true,
        is_available: true,
        is_approved: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Profitable pig breeds for Rwandan climate",
        content:
          "I'm starting my pig farming journey and wondering which breeds perform best in Rwanda. Looking for breeds that are hardy, fast-growing, and have good market demand.",
        author_id: 3, // Sally Ulrich
        upvotes: 45,
        downvotes: 2,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
        updated_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Organic pig feed ingredients sourced locally",
        content:
          "Has anyone experimented with locally sourced organic feed ingredients? I'm interested in reducing feed costs while maintaining quality. Looking for sustainable alternatives.",
        author_id: 4, // Ethel Bassey
        upvotes: 19,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Pregnant sows for sale - Due in 3 weeks",
        content:
          "I have 4 pregnant sows (Yorkshire x Local cross) due to farrow in approximately 3 weeks. Healthy animals with good farrowing history. 220,000 RWF each. Located near Nyagatare.",
        author_id: 7, // Sarah Expert
        upvotes: 16,
        downvotes: 0,
        is_market_post: true,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
        updated_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Biosecurity measures for small pig farms",
        content:
          "What biosecurity protocols do you implement on your farms? I want to protect my pigs from diseases but need practical measures that won't break the bank for a small operation.",
        author_id: 6, // John Farmer
        upvotes: 34,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Pig manure management and composting tips",
        content:
          "Looking for efficient ways to manage pig manure on my farm. Interested in composting methods that can turn waste into valuable fertilizer. Any success stories?",
        author_id: 5, // Jean De Dieu Alvirisi
        upvotes: 22,
        downvotes: 0,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago
        updated_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Mobile pig slaughter services in Eastern Province",
        content:
          "Offering mobile slaughter services for small to medium pig farms in Eastern Province. Hygienic processing, fair prices, and we handle all documentation. Contact for rates.",
        author_id: 2, // John Keller
        upvotes: 9,
        downvotes: 2,
        is_market_post: true,
        is_available: true,
        is_approved: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Water quality and consumption for pigs",
        content:
          "How do you ensure water quality for your pigs? What are the daily water requirements per pig, and what filtration or treatment methods do you recommend?",
        author_id: 3, // Sally Ulrich
        upvotes: 17,
        downvotes: 0,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Pig farming training workshop - Kigali",
        content:
          "Announcing a comprehensive pig farming workshop covering breeding, feeding, health management, and marketing. September 15-17 in Kigali. Early bird discount available!",
        author_id: 7, // Sarah Expert
        upvotes: 52,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // 16 days ago
        updated_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Piglet starter feed - high quality, competitive prices",
        content:
          "New shipment of premium piglet starter feed just arrived. Specially formulated for optimal growth in the first 8 weeks. 25kg bags at 22,000 RWF. Delivery available in Kigali area.",
        author_id: 4, // Ethel Bassey
        upvotes: 11,
        downvotes: 0,
        is_market_post: true,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), // 17 days ago
        updated_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Record keeping systems for pig farms",
        content:
          "What record keeping systems do you use to track breeding, feeding, health treatments, and finances? Looking for simple but effective methods for a 40-pig operation.",
        author_id: 6, // John Farmer
        upvotes: 25,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Emergency veterinary services - Northern Province",
        content:
          "Experienced livestock veterinarian offering emergency and routine services for pig farms in Northern Province. 24/7 availability for critical cases. Competitive rates.",
        author_id: 5, // Jean De Dieu Alvirisi
        upvotes: 14,
        downvotes: 0,
        is_market_post: true,
        is_available: true,
        is_approved: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 days ago
        updated_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Pig weight estimation without scales",
        content:
          "Share your methods for estimating pig weight without expensive scales. I've heard about heart girth measurements but would love to hear about other practical techniques.",
        author_id: 2, // John Keller
        upvotes: 33,
        downvotes: 2,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        id: uuidv4(),
        title: "Seasonal pricing trends for live pigs",
        content:
          "What patterns have you noticed in pig prices throughout the year? I'm trying to optimize my marketing strategy and would appreciate insights on the best times to sell.",
        author_id: 3, // Sally Ulrich
        upvotes: 29,
        downvotes: 1,
        is_market_post: false,
        is_available: true,
        is_approved: true,
        is_deleted: false,
        created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
        updated_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
    ];

    // Insert posts
    await queryInterface.bulkInsert("discussion_posts", posts);

    // Create tag associations for the posts
    const tagAssociations = [
      // Post 1: Best feeding practices (Feed, Health)
      { post_id: posts[0].id, tag_id: "550e8400-e29b-41d4-a716-446655440004" }, // Feed
      { post_id: posts[0].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health

      // Post 2: Feed supplier (Market, Feed)
      { post_id: posts[1].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[1].id, tag_id: "550e8400-e29b-41d4-a716-446655440004" }, // Feed

      // Post 3: Housing designs (Equipment, General)
      { post_id: posts[2].id, tag_id: "550e8400-e29b-41d4-a716-446655440005" }, // Equipment
      { post_id: posts[2].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 4: Vaccination (Health)
      { post_id: posts[3].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health

      // Post 5: Breeding boars (Market, Breeding)
      { post_id: posts[4].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[4].id, tag_id: "550e8400-e29b-41d4-a716-446655440006" }, // Breeding

      // Post 6: Heat stress (Health, Equipment)
      { post_id: posts[5].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health
      { post_id: posts[5].id, tag_id: "550e8400-e29b-41d4-a716-446655440005" }, // Equipment

      // Post 7: Equipment auction (Market, Equipment)
      { post_id: posts[6].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[6].id, tag_id: "550e8400-e29b-41d4-a716-446655440005" }, // Equipment

      // Post 8: Pig breeds (Breeding, General)
      { post_id: posts[7].id, tag_id: "550e8400-e29b-41d4-a716-446655440006" }, // Breeding
      { post_id: posts[7].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 9: Organic feed (Feed)
      { post_id: posts[8].id, tag_id: "550e8400-e29b-41d4-a716-446655440004" }, // Feed

      // Post 10: Pregnant sows (Market, Breeding)
      { post_id: posts[9].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[9].id, tag_id: "550e8400-e29b-41d4-a716-446655440006" }, // Breeding

      // Post 11: Biosecurity (Health)
      { post_id: posts[10].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health

      // Post 12: Manure management (General, Equipment)
      { post_id: posts[11].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General
      { post_id: posts[11].id, tag_id: "550e8400-e29b-41d4-a716-446655440005" }, // Equipment

      // Post 13: Slaughter services (Market)
      { post_id: posts[12].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market

      // Post 14: Water quality (Health, General)
      { post_id: posts[13].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health
      { post_id: posts[13].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 15: Training workshop (Events, General)
      { post_id: posts[14].id, tag_id: "550e8400-e29b-41d4-a716-446655440007" }, // Events
      { post_id: posts[14].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 16: Starter feed (Market, Feed)
      { post_id: posts[15].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[15].id, tag_id: "550e8400-e29b-41d4-a716-446655440004" }, // Feed

      // Post 17: Record keeping (General)
      { post_id: posts[16].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 18: Veterinary services (Market, Health)
      { post_id: posts[17].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[17].id, tag_id: "550e8400-e29b-41d4-a716-446655440003" }, // Health

      // Post 19: Weight estimation (General)
      { post_id: posts[18].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General

      // Post 20: Pricing trends (Market, General)
      { post_id: posts[19].id, tag_id: "550e8400-e29b-41d4-a716-446655440002" }, // Market
      { post_id: posts[19].id, tag_id: "550e8400-e29b-41d4-a716-446655440001" }, // General
    ];

    // Insert tag associations
    await queryInterface.bulkInsert("post_tags", tagAssociations);

    // Create media associations using existing Cloudinary media
    // We'll randomly assign the existing media to some of the new posts
    const mediaAssociations = [
      // Assign first image to breeding boars post (makes sense for livestock sale)
      {
        id: require("uuid").v4(),
        post_id: posts[4].id, // Breeding boars post
        media_type: "image",
        storage_key:
          "farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829771926_post_image",
        url: "https://res.cloudinary.com/dsw1y9bmj/image/upload/v1754829779/farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829771926_post_image.jpg",
        thumbnail_url:
          "https://res.cloudinary.com/dsw1y9bmj/image/upload/c_fill,f_auto,h_200,q_auto,w_300/v1/farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829771926_post_image?_a=BAMAK+cc0",
        file_name: "post_image.jpg",
        file_size: 0,
        mime_type: "image/jpeg",
        display_order: 0,
        status: "ready",
        created_at: posts[4].created_at,
      },

      // Assign second image to pig housing design post
      {
        id: require("uuid").v4(),
        post_id: posts[2].id, // Housing designs post
        media_type: "image",
        storage_key:
          "farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829799954_post_image2",
        url: "https://res.cloudinary.com/dsw1y9bmj/image/upload/v1754829803/farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829799954_post_image2.jpg",
        thumbnail_url:
          "https://res.cloudinary.com/dsw1y9bmj/image/upload/c_fill,f_auto,h_200,q_auto,w_300/v1/farmconnect/posts/4eba09bb-eabf-4e2d-bacd-07cdcb688e47/1754829799954_post_image2?_a=BAMAK+cc0",
        file_name: "post_image2.jpg",
        file_size: 0,
        mime_type: "image/jpeg",
        display_order: 0,
        status: "ready",
        created_at: posts[2].created_at,
      },

      // Assign video to training workshop post (makes sense for educational content)
      {
        id: require("uuid").v4(),
        post_id: posts[14].id, // Training workshop post
        media_type: "video",
        storage_key:
          "farmconnect/posts/85e62b6f-ec5c-4b07-9297-dd32d194ef39/1754830371764_post_video",
        url: "https://res.cloudinary.com/dsw1y9bmj/video/upload/v1754830408/farmconnect/posts/85e62b6f-ec5c-4b07-9297-dd32d194ef39/1754830371764_post_video.mp4",
        thumbnail_url:
          "https://res.cloudinary.com/dsw1y9bmj/video/upload/c_fill,h_200,so_auto,w_300/v1/farmconnect/posts/85e62b6f-ec5c-4b07-9297-dd32d194ef39/1754830371764_post_video.jpg?_a=BAMAK+cc0",
        file_name: "post_video.mp4",
        file_size: 0,
        mime_type: "video/mp4",
        display_order: 0,
        status: "ready",
        created_at: posts[14].created_at,
      },
    ];

    // Insert media associations
    await queryInterface.bulkInsert("post_media", mediaAssociations);
  },

  down: async (queryInterface, Sequelize) => {
    // Delete the posts and their associations (cascading will handle media and tags)
    await queryInterface.bulkDelete("discussion_posts", {
      title: {
        [Sequelize.Op.in]: [
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
        ],
      },
    });
  },
};
