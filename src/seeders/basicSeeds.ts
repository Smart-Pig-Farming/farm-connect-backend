import Role from "../models/Role";
import Level from "../models/Level";
import Tag from "../models/Tag";

export async function seedRoles(): Promise<void> {
  try {
    // Check if roles already exist
    const existingRoles = await Role.count();
    if (existingRoles > 0) {
      console.log("Roles already exist, skipping seed...");
      return;
    }

    // Create roles
    await Role.bulkCreate([
      {
        name: "farmer",
        description:
          "Pig farmers who use the platform for best practices and community engagement",
      },
      {
        name: "admin",
        description:
          "System administrators with full access to manage users and content",
      },
      {
        name: "vet",
        description: "Veterinarians who provide expert advice and guidance",
      },
      {
        name: "govt",
        description: "Government officials monitoring agricultural practices",
      },
    ]);

    console.log("Roles seeded successfully");
  } catch (error) {
    console.error("Error seeding roles:", error);
    throw error;
  }
}

export async function seedLevels(): Promise<void> {
  try {
    // Check if levels already exist
    const existingLevels = await Level.count();
    if (existingLevels > 0) {
      console.log("Levels already exist, skipping seed...");
      return;
    }

    // Create levels
    await Level.bulkCreate([
      {
        name: "Beginner",
        description: "New users starting their journey",
        min_points: 0,
        max_points: 100,
      },
      {
        name: "Intermediate",
        description: "Users with some experience",
        min_points: 101,
        max_points: 500,
      },
      {
        name: "Advanced",
        description: "Users with experienced knowledge",
        min_points: 501,
        max_points: 1000,
      },
      {
        name: "Expert",
        description: "Highly experienced users",
        min_points: 1001,
        max_points: 99999,
      },
    ]);

    console.log("Levels seeded successfully");
  } catch (error) {
    console.error("Error seeding levels:", error);
    throw error;
  }
}

export async function runBasicSeeds(): Promise<void> {
  try {
    console.log("Starting basic seed process...");
    await seedRoles();
    await seedLevels();
    await seedTags();
    console.log("Basic seed process completed successfully");
  } catch (error) {
    console.error("Error running basic seeds:", error);
    throw error;
  }
}

// Seed baseline discussion tags
export async function seedTags(): Promise<void> {
  try {
    const existing = await Tag.count();
    if (existing > 0) {
      console.log("Tags already exist, skipping seed...");
      return;
    }
    const tags = [
      { name: "breeding", color: "green" },
      { name: "equipment", color: "gray" },
      { name: "events", color: "purple" },
      { name: "feed", color: "orange" },
      { name: "general", color: "blue" },
      { name: "health", color: "red" },
      { name: "market", color: "teal" },
    ];
    await Tag.bulkCreate(tags);
    console.log("Tags seeded successfully");
  } catch (e) {
    console.error("Error seeding tags:", e);
    throw e;
  }
}
