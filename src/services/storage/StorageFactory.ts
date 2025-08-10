import { MediaStorageService } from "./MediaStorageInterface";
import { CloudinaryStorageService } from "./CloudinaryStorageService";

export class StorageFactory {
  static createStorageService(): MediaStorageService {
    const provider = process.env.MEDIA_STORAGE_PROVIDER || "CLOUDINARY";

    switch (provider.toUpperCase()) {
      case "CLOUDINARY":
        return new CloudinaryStorageService({
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
          apiKey: process.env.CLOUDINARY_API_KEY || "",
          apiSecret: process.env.CLOUDINARY_API_SECRET || "",
        });

      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }
}
