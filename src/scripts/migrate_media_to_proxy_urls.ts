import sequelize from "../config/database";
import { Op } from "sequelize";
import PostMedia from "../models/PostMedia";
import { StorageFactory } from "../services/storage/StorageFactory";

async function main() {
  console.log("Starting media URL migration...");

  // For demonstration, let's just update the records to use proxy URLs since local files don't exist
  const rows = await PostMedia.findAll({
    // where: {
    //   url: null, // Only migrate records that don't have URLs yet
    // },
    order: [["created_at", "ASC"]],
  });

  console.log(`Found ${rows.length} media rows to migrate`);

  for (const row of rows) {
    try {
      const storageKey = (row as any).storage_key as string;

      // For demo purposes, since we don't have actual files,
      // we'll set the URLs to use our proxy endpoints
      const proxyUrl = `/api/discussions/media/${encodeURIComponent(
        storageKey
      )}`;
      const proxyThumbnailUrl = `/api/discussions/media/${encodeURIComponent(
        storageKey
      )}/thumbnail`;

      (row as any).url = proxyUrl;
      (row as any).thumbnail_url = proxyThumbnailUrl;
      await row.save();

      console.log(`Updated ${row.id}: ${proxyUrl}`);
    } catch (err) {
      console.error(`Failed to update ${row.id}:`, err);
    }
  }

  console.log("Migration completed");
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
