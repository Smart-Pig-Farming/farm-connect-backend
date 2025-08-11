import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import {
  MediaStorageService,
  MediaMetadata,
  StorageResult,
  MediaUploadError,
  MediaNotFoundError,
} from "./MediaStorageInterface";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryStorageService implements MediaStorageService {
  constructor(private config: CloudinaryConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }

  async upload(file: Buffer, metadata: MediaMetadata): Promise<StorageResult> {
    try {
      const baseOptions = {
        folder: `farmconnect/posts/${metadata.postId}`,
        resource_type:
          metadata.mediaType === "video"
            ? ("video" as const)
            : ("image" as const),
        public_id: `${Date.now()}_${metadata.fileName.split(".")[0]}`,
      };

      // Different configurations for images vs videos
      const uploadOptions =
        metadata.mediaType === "video"
          ? {
              ...baseOptions,
              // For videos: also generate a poster frame eagerly in background
              eager_async: true,
              eager: [
                {
                  width: 300,
                  height: 200,
                  crop: "fill",
                  format: "jpg",
                  start_offset: this.getVideoThumbStartOffset(),
                },
              ],
            }
          : {
              ...baseOptions,
              format: this.getFormatFromMimeType(metadata.mimeType),
              transformation: [{ quality: "auto", fetch_format: "auto" }],
            };

      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            uploadOptions,
            (error: any, result: UploadApiResponse | undefined) => {
              if (error) reject(error);
              else if (result) resolve(result);
              else reject(new Error("No result from Cloudinary"));
            }
          )
          .end(file);
      });

      return {
        storageKey: result.public_id,
        url: result.secure_url,
        thumbnailUrl:
          metadata.mediaType === "video"
            ? this.generateVideoThumbnailUrl(result.public_id)
            : this.generateImageThumbnailUrl(result.public_id),
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new MediaUploadError(
        `Failed to upload to Cloudinary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getUrl(storageKey: string): Promise<string> {
    try {
      const result = await cloudinary.api.resource(storageKey);
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary getUrl error:", error);
      throw new MediaNotFoundError(storageKey);
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(storageKey);
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      throw new MediaNotFoundError(storageKey);
    }
  }

  async generateThumbnail(storageKey: string): Promise<string> {
    // Determine resource type dynamically; try video first, then image
    try {
      await cloudinary.api.resource(storageKey, { resource_type: "video" });
      return this.generateVideoThumbnailUrl(storageKey);
    } catch (_) {
      // Not a video (or not found as video), try image
      try {
        await cloudinary.api.resource(storageKey, { resource_type: "image" });
        return this.generateImageThumbnailUrl(storageKey);
      } catch (e) {
        // Fallback to image-style URL to avoid throwing; caller may handle 404 later
        return this.generateImageThumbnailUrl(storageKey);
      }
    }
  }

  private getFormatFromMimeType(mimeType: string): string | undefined {
    const mimeToFormat: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/mov": "mov",
    };
    return mimeToFormat[mimeType];
  }

  private generateImageThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 300,
      height: 200,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto",
    });
  }

  private generateVideoThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: "video",
      width: 300,
      height: 200,
      crop: "fill",
      start_offset: this.getVideoThumbStartOffset(),
      format: "jpg",
    });
  }

  // Allow overriding the video poster frame selection via env (e.g., "auto", "0", "2.5")
  private getVideoThumbStartOffset(): string | number {
    const env = process.env.CLOUDINARY_VIDEO_THUMB_OFFSET;
    if (!env || env.trim() === "") return "auto"; // default smart selection
    const n = Number(env);
    return isNaN(n) ? env : n; // allow numeric seconds or explicit Cloudinary expressions
  }
}
