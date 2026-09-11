import jwt from "jsonwebtoken";

const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id.toString(),
      role: admin.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export default generateToken;