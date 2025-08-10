import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import sequelize from "../config/database";
import PostMedia from "../models/PostMedia";
import { StorageFactory } from "../services/storage/StorageFactory";

async function main() {
  const storage = StorageFactory.createStorageService();
  const baseDir =
    process.env.MEDIA_LOCAL_BASE || path.join(process.cwd(), "public");
  const limit =
    parseInt(process.env.MEDIA_MIGRATION_LIMIT || "0", 10) || undefined;

  const rows = await PostMedia.findAll({
    order: [["created_at", "ASC"]],
    ...(limit ? { limit } : {}),
  });
  console.log(`Found ${rows.length} media rows`);

  for (const row of rows) {
    try {
      // Skip if already migrated
      if ((row as any).url && (row as any).thumbnail_url) {
        console.log(`Skip ${row.id} already has URLs`);
        continue;
      }

      const storageKey = (row as any).storage_key as string;
      // If storage_key starts with '/' treat as local relative path under public
      const filePath = storageKey.startsWith("/")
        ? path.join(baseDir, storageKey)
        : path.join(baseDir, storageKey);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found for ${row.id}: ${filePath}`);
        continue;
      }
      const buffer = await fs.promises.readFile(filePath);
      const mediaType = (row as any).media_type as "image" | "video";
      const fileName = path.basename(filePath);
      const mimeType = (row as any).mime_type as string;
      const result = await storage.upload(buffer, {
        postId: (row as any).post_id,
        mediaType,
        fileName,
        mimeType,
        fileSize: buffer.length,
      });

      (row as any).storage_key = result.storageKey; // switch to provider key
      (row as any).url = result.url;
      (row as any).thumbnail_url = result.thumbnailUrl || null;
      await row.save();
      console.log(`Migrated ${row.id}: ${result.storageKey}`);
    } catch (err) {
      console.error(`Failed to migrate ${row.id}:`, err);
    }
  }

  console.log("Done");
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
