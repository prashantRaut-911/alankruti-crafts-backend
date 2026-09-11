import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT =
  process.env.PORT || 5000;

const startServer =
  async () => {
    try {
      await connectDB();

      app.listen(
        PORT,
        () => {
          console.log(
            `Server running on http://localhost:${PORT}`
          );
        }
      );
    } catch (error) {
      console.error(
        "Unable to start server:",
        error.message
      );

      process.exit(1);
    }
  };

startServer();