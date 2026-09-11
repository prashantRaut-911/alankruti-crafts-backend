import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import {
  uploadImage,
  uploadImages,
} from "../controllers/uploadController.js";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Single image upload
router.post(
  "/image",
  protect,
  adminOnly,
  upload.single("image"),
  uploadImage
);

// Multiple image upload
router.post(
  "/images",
  protect,
  adminOnly,
  upload.array("images", 5),
  uploadImages
);

export default router;