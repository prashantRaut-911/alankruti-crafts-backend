import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const protect = async (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const token =
      authorization.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    const admin =
      await Admin.findById(
        decoded.id
      );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Admin account not found.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Admin account is inactive.",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    if (
      error.name ===
        "JsonWebTokenError" ||
      error.name ===
        "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication token.",
      });
    }

    next(error);
  }
};