import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import userRoute from "./routes/user.route.js";
import connectDB from "./db/index.js";
dotenv.config();

const port = process.env.PORT || 3001;
const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/q-app/api/v1/user", userRoute);

try {
  await connectDB();
  app.listen(port, () => {
    console.log(`🚀 Server running on ${port}`);
  });
} catch (err) {
  console.error("❌ Failed to connect to the database:", err.message);
  process.exit(1);
}
