import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import DocMeta from "../models/DocMeta.js";
import { processAndUpsert } from "../utils/processor.js";

const router = express.Router();

/* -------------------- MULTER CONFIG -------------------- */
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/* -------------------- UPLOAD DOCUMENT -------------------- */
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    // ✅ PostgreSQL / Sequelize user id
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 🔹 Process PDF → embeddings → Pinecone
    const pineconeIds = await processAndUpsert(
      file.path,
      file.originalname,
      userId
    );

    // 🔹 Store metadata in PostgreSQL
    const doc = await DocMeta.create({
      userId,
      filename: file.originalname,
      pineconeIds,
      metadata: {
        size: file.size,
        mimetype: file.mimetype,
      },
    });

    return res.json({
      success: true,
      message: "Document uploaded and processed successfully",
      docId: doc.id,              
      chunks: pineconeIds.length,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({
      error: "Failed to process document",
    });
  }
});

export default router;
