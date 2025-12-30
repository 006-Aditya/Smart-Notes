import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import DocMeta from "../models/DocMeta.js";
import { processAndUpsert } from "../utils/processor.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ---------------------------------------------
// UPLOAD DOCUMENT
// ---------------------------------------------
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user._id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // 🚀 This returns the vector IDs
    const pineconeIds = await processAndUpsert(file.path, file.originalname, userId);

    console.log("🔥 Stored Pinecone Vector IDs:", pineconeIds);

    // 🚀 Store them in MongoDB
    const doc = await DocMeta.create({
      userId,
      filename: file.originalname,
      pineconeIds: pineconeIds, // 👈 MUST EXIST
      metadata: {
        size: file.size,
        mimetype: file.mimetype,
      },
    });

    res.json({
      success: true,
      message: "Document uploaded and processed successfully",
      docId: doc._id,
      chunks: pineconeIds.length,
    });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Failed to process document" });
  }
});


export default router;
