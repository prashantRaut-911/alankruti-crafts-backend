import multer from "multer";

export const notFound = (
  req,
  res
) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  error,
  req,
  res,
  next
) => {
  console.error(
    "Server Error:",
    error
  );

  let statusCode =
    res.statusCode >= 400
      ? res.statusCode
      : 500;

  let message =
    error.message ||
    "Internal server error.";

  // Multer upload errors
  if (error instanceof multer.MulterError) {
    statusCode = 400;

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message =
          "Image size must be 5 MB or less.";
        break;

      case "LIMIT_FILE_COUNT":
        message =
          "You can upload a maximum of 5 images.";
        break;

      case "LIMIT_UNEXPECTED_FILE":
        message =
          "Invalid upload field or maximum 5 images allowed.";
        break;

      case "LIMIT_PART_COUNT":
        message =
          "Too many upload fields.";
        break;

      default:
        message =
          "Image upload failed. Please check the selected files.";
    }
  }

  // Invalid image format
  if (
    !(error instanceof multer.MulterError) &&
    error.message ===
      "Invalid image format. Please upload JPG, PNG, WEBP, or GIF."
  ) {
    statusCode = 400;
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};