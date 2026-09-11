import Admin from "../models/Admin.js";
import generateToken from "../utils/generateToken.js";

export const loginAdmin = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const admin =
      await Admin.findOne({
        email: normalizedEmail,
      }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "This admin account is inactive.",
      });
    }

    const passwordMatches =
      await admin.comparePassword(
        password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const token =
      generateToken(admin);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,

      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};