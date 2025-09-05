import multer from "multer";
import { Request } from "express";

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter function with business rules
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed file types based on business rules
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/webm",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM`
      )
    );
  }
};

// Configure multer with business rules
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 4, // Maximum 4 files per upload (business rule: max 4 images)
  },
});

export const uploadMedia = upload.array("media", 4); // Allow up to 4 files with field name 'media' (business rule)
export const uploadSingle = upload.single("media"); // Single file upload

export default upload;
