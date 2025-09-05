import sequelize from "../config/database";
import PostMedia from "../models/PostMedia";

async function main() {
  try {
    const rows = await PostMedia.findAll({
      limit: 5,
      attributes: ["id", "storage_key", "file_name", "url", "thumbnail_url"],
    });

    console.log("Current media records:");
    rows.forEach((row) => {
      console.log(`  ${row.id}:`);
      console.log(`    storage_key: ${(row as any).storage_key}`);
      console.log(`    file_name: ${(row as any).file_name}`);
      console.log(`    url: ${(row as any).url || "null"}`);
      console.log(`    thumbnail_url: ${(row as any).thumbnail_url || "null"}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

main();
