// Media storage interface for the Strategy pattern
export interface MediaMetadata {
  postId: string;
  mediaType: "image" | "video";
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface StorageResult {
  storageKey: string;
  url: string;
  thumbnailUrl?: string;
}

export interface MediaStorageService {
  upload(file: Buffer, metadata: MediaMetadata): Promise<StorageResult>;
  getUrl(storageKey: string): Promise<string>;
  delete(storageKey: string): Promise<void>;
  generateThumbnail(storageKey: string): Promise<string>;
}

// Error types
export class MediaStorageError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "MediaStorageError";
  }
}

export class MediaUploadError extends MediaStorageError {
  constructor(message: string) {
    super(message, "UPLOAD_FAILED");
  }
}

export class MediaNotFoundError extends MediaStorageError {
  constructor(storageKey: string) {
    super(`Media not found: ${storageKey}`, "NOT_FOUND");
  }
}
