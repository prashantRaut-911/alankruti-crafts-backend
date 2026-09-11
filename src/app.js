import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

import {
  notFound,
  errorHandler,
} from "./middleware/errorMiddleware.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Alankruti Crafts API is running.",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running.",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;