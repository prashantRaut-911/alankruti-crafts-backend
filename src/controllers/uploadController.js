import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "alankruti-crafts/products",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    streamifier
      .createReadStream(buffer)
      .pipe(uploadStream);
  });
};

const deleteCloudinaryImages = async (
  publicIds
) => {
  if (!publicIds.length) {
    return;
  }

  try {
    await cloudinary.api.delete_resources(
      publicIds,
      {
        resource_type: "image",
        type: "upload",
      }
    );
  } catch (cleanupError) {
    console.error(
      "Cloudinary cleanup failed:",
      cleanupError
    );
  }
};

export const uploadImage = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    const uploadResult =
      await uploadBufferToCloudinary(
        req.file.buffer
      );

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      image: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadImages = async (
  req,
  res,
  next
) => {
  const uploadedPublicIds = [];

  try {
    if (
      !req.files ||
      req.files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one image.",
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message:
          "You can upload a maximum of 5 images.",
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const uploadResult =
        await uploadBufferToCloudinary(
          file.buffer
        );

      uploadedPublicIds.push(
        uploadResult.public_id
      );

      uploadedImages.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      });
    }

    return res.status(201).json({
      success: true,
      message: `${uploadedImages.length} image${
        uploadedImages.length > 1
          ? "s"
          : ""
      } uploaded successfully.`,
      images: uploadedImages,
    });
  } catch (error) {
    await deleteCloudinaryImages(
      uploadedPublicIds
    );

    next(error);
  }
};