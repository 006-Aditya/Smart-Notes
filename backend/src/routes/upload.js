import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import DocMeta from "../models/DocMeta.js";
import { processAndUpsert } from "../utils/processor.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const docs = await DocMeta.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/* -------------------- UPLOAD DOCUMENT -------------------- */
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    //  Process PDF → embeddings → Pinecone
    const { vectorIds: pineconeIds, questions } = await processAndUpsert(
      file.path,
      file.originalname,
      userId
    );

    // Store metadata in PostgreSQL
    const doc = await DocMeta.create({
      userId,
      filename: file.originalname,
      pineconeIds,
      expectedQuestions: questions,   
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
      questions,   
    });
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({
      error: "Failed to process document",
    });
  }
});

export default router;
