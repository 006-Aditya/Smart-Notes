import express from "express";
import auth from "../middleware/auth.js";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  makeEmbeddingsClient,
  rewriteQuery,
  answerWithContext,
} from "../utils/genai.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user._id?.toString();

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    // 1️⃣ Rewrite question if follow-up
    const rewrittenQ = await rewriteQuery([], question);

    // 2️⃣ Generate embedding
    const embeddings = makeEmbeddingsClient();
    const [queryVector] = await embeddings.embedDocuments([rewrittenQ]);

    // 3️⃣ Pinecone Search (correct format)
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

    const result = await index.namespace(userId).query({
      vector: queryVector,
      topK: 10,
      includeMetadata: true,
    });

    const matches = result.matches || [];

    if (!matches.length) {
      return res.json({
        answer:
          "I couldn't find anything related to your question in your uploaded notes.",
        rewrittenQuestion: rewrittenQ,
        contextChunks: [],
      });
    }

    // 4️⃣ Build dynamic RAG context
    const context = matches
      .map((m) => m.metadata?.text ?? "")
      .filter(Boolean)
      .join("\n\n---\n\n");

    // 5️⃣ Generate final answer with retrieved chunks
    const answer = await answerWithContext([], rewrittenQ, context);

    res.json({
      question,
      rewrittenQuestion: rewrittenQ,
      answer,
      contextChunks: matches,
    });
  } catch (err) {
    console.error("❌ Query Error:", err);
    res.status(500).json({ error: "Server error processing query" });
  }
});

export default router;
