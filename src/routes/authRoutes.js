import express from "express";

import {
  loginAdmin,
} from "../controllers/authController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

router.post(
  "/login",
  loginAdmin
);

router.get(
  "/me",
  protect,
  (req, res) => {
    res.status(200).json({
      success: true,

      admin: {
        _id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
      },
    });
  }
);

export default router;