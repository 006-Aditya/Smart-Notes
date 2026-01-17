import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import "./models/Index.js"; 

import { connectDB, sequelize } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import queryRoutes from "./routes/query.js";

const app = express();

app.use(cors());
app.use(express.json());

await connectDB();
await sequelize.sync({ alter: true }); 

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/query", queryRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
