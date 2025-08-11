import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import sequelize from "../config/database";
import PostMedia from "../models/PostMedia";
import { StorageFactory } from "../services/storage/StorageFactory";

async function main() {
  const storage = StorageFactory.createStorageService();

  const limitEnv =
    process.env.THUMB_BACKFILL_LIMIT || process.env.MEDIA_MIGRATION_LIMIT;
  const limit = limitEnv ? parseInt(limitEnv, 10) : undefined;

  // Select rows missing thumbnails or using proxy thumbnail URLs to replace with Cloudinary versions
  const where: any = {
    [Op.or]: [
      { thumbnail_url: null },
      { thumbnail_url: { [Op.eq]: "" } },
      { thumbnail_url: { [Op.like]: "/api/discussions/media/%/thumbnail" } },
    ],
  };

  const rows = await PostMedia.findAll({
    where,
    order: [["created_at", "ASC"]],
    ...(limit ? { limit } : {}),
  });

  console.log(`Backfilling thumbnails for ${rows.length} media rows...`);

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      const key = (row as any).storage_key as string;
      if (!key) {
        console.warn(`Row ${row.id} has no storage_key, skipping`);
        fail++;
        continue;
      }

      // Compute Cloudinary-style thumbnail URL based on resource type (video/image)
      const thumbUrl = await storage.generateThumbnail(key);
      (row as any).thumbnail_url = thumbUrl;

      // Also backfill url if missing
      if (!(row as any).url) {
        try {
          (row as any).url = await storage.getUrl(key);
        } catch (_) {
          // ignore if not resolvable
        }
      }

      await row.save();
      ok++;
      console.log(`✔ Updated thumbnail for media ${row.id}`);
    } catch (e) {
      fail++;
      console.error(`✖ Failed to update media ${row.id}:`, e);
    }
  }

  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
