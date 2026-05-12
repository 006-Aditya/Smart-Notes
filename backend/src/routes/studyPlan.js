import express from "express";
import auth from "../middleware/auth.js";
import StudyPlan from "../models/StudyPlan.js";
import DocMeta from "../models/DocMeta.js";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  extractDocumentTopics,
  generateStudyPlan,
  calculateDaysUntilExam,
} from "../utils/studyPlanGenerator.js";
import { makeEmbeddingsClient } from "../utils/genai.js";

const router = express.Router();

/* -------------------------------------------------------
   GET /api/study-plans
   List all study plans for current user
------------------------------------------------------- */
router.get("/", auth, async (req, res) => {
  try {
    const plans = await StudyPlan.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: DocMeta,
          attributes: ["filename"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json(plans);
  } catch (err) {
    console.error("❌ Get study plans error:", err);
    return res.status(500).json({ error: "Failed to fetch study plans" });
  }
});

/* -------------------------------------------------------
   GET /api/study-plans/:id
   Get a specific study plan
------------------------------------------------------- */
router.get("/:id", auth, async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: DocMeta,
          attributes: ["filename"],
        },
      ],
    });

    if (!plan) {
      return res.status(404).json({ error: "Study plan not found" });
    }

    return res.json(plan);
  } catch (err) {
    console.error("❌ Get study plan error:", err);
    return res.status(500).json({ error: "Failed to fetch study plan" });
  }
});

/* -------------------------------------------------------
   POST /api/study-plans/generate
   Generate a new study plan from a document
   Body: { docId, examDate, subject, hoursPerDay }
------------------------------------------------------- */
router.post("/generate", auth, async (req, res) => {
  try {
    const { docId, examDate, subject, hoursPerDay = 2 } = req.body;

    // Validate inputs
    if (!docId || !examDate) {
      return res.status(400).json({ error: "docId and examDate are required" });
    }

    const totalDays = calculateDaysUntilExam(examDate);
    if (totalDays < 1) {
      return res
        .status(400)
        .json({ error: "Exam date must be in the future" });
    }
    if (totalDays > 90) {
      return res
        .status(400)
        .json({ error: "Exam date must be within 90 days" });
    }

    // Verify document belongs to user
    const doc = await DocMeta.findOne({
      where: { id: docId, userId: req.user.id },
    });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log(`📅 Generating study plan: ${totalDays} days until exam`);

    // Step 1: Retrieve document chunks from Pinecone to extract content
    let documentText = "";
    let overview = "";
    let keyTopics = [];

    try {
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
      const userId = req.user.id.toString();

      // Use a broad embedding query to get representative chunks
      const embeddings = makeEmbeddingsClient();
      const [queryVector] = await embeddings.embedDocuments([
        "introduction overview summary key topics chapters main concepts",
      ]);

      const result = await index.namespace(userId).query({
        vector: queryVector,
        topK: 20,
        includeMetadata: true,
        filter: { filename: doc.filename },
      });

      // Gather text from top chunks
      const chunks = result.matches || [];
      documentText = chunks
        .map((m) => m.metadata?.text || "")
        .filter(Boolean)
        .join("\n\n");

      if (!documentText) {
        // Fallback: use questions stored at upload time as topic hints
        const storedQuestions = doc.expectedQuestions || [];
        documentText = storedQuestions.join("\n");
      }
    } catch (pineconeErr) {
      console.error("⚠️ Pinecone retrieval failed, using stored questions:", pineconeErr.message);
      documentText = (doc.expectedQuestions || []).join("\n");
    }

    // Step 2: Extract topics using Ollama
    if (documentText) {
      const extracted = await extractDocumentTopics(documentText);
      overview = extracted.overview;
      keyTopics = extracted.keyTopics;
    }

    // Fallback topics from stored questions
    if (keyTopics.length === 0 && doc.expectedQuestions?.length > 0) {
      keyTopics = doc.expectedQuestions.slice(0, 10).map((q) =>
        q.replace(/\?$/, "").substring(0, 60)
      );
      overview = `Study material from ${doc.filename}`;
    }

    if (keyTopics.length === 0) {
      keyTopics = ["Introduction", "Core Concepts", "Key Principles", "Applications", "Review"];
    }

    console.log(`📚 Extracted ${keyTopics.length} topics`);

    // Step 3: Generate daily plan using Ollama
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];

    const dailyPlan = await generateStudyPlan({
      keyTopics,
      overview,
      examDate,
      subject: subject || doc.filename.replace(/\.pdf$/i, ""),
      startDate,
      totalDays,
      hoursPerDay: parseInt(hoursPerDay),
    });

    console.log(`✅ Generated ${dailyPlan.length}-day plan`);

    // Step 4: Save to PostgreSQL
    const studyPlan = await StudyPlan.create({
      userId: req.user.id,
      docId: doc.id,
      examDate,
      subject: subject || doc.filename.replace(/\.pdf$/i, ""),
      totalDays,
      dailyPlan,
      overview,
      keyTopics,
      status: "active",
    });

    return res.json({
      success: true,
      plan: studyPlan,
      message: `Study plan created: ${totalDays} days until your exam`,
    });
  } catch (err) {
    console.error("❌ Generate study plan error:", err);
    return res.status(500).json({ error: "Failed to generate study plan" });
  }
});

/* -------------------------------------------------------
   PATCH /api/study-plans/:id/status
   Update plan status (active/completed/archived)
------------------------------------------------------- */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "completed", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const plan = await StudyPlan.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    await plan.update({ status });
    return res.json({ success: true, status });
  } catch (err) {
    console.error("❌ Update status error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

/* -------------------------------------------------------
   DELETE /api/study-plans/:id
   Delete a study plan
------------------------------------------------------- */
router.delete("/:id", auth, async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    await plan.destroy();
    return res.json({ success: true, message: "Study plan deleted" });
  } catch (err) {
    console.error("❌ Delete plan error:", err);
    return res.status(500).json({ error: "Failed to delete study plan" });
  }
});

export default router;