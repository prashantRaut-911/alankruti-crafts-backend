import multer from "multer";

/*
 * Store uploaded files in memory.
 *
 * We do not save product images permanently
 * on the Render/server filesystem.
 *
 * The image will be sent from memory to
 * Cloudinary in the next phase.
 */
const storage = multer.memoryStorage();

/*
 * Only allow common image formats.
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      "Invalid image format. Please upload JPG, PNG, WEBP, or GIF."
    )
  );
};

/*
 * Upload configuration.
 *
 * Limit:
 * 5 MB per image.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;