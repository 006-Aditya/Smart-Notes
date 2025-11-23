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
    const userId = req.user._id;

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    // 1) Rewrite for follow-ups
    const rewrittenQ = await rewriteQuery([], question);

    // 2) Create embedding
    const embeddings = makeEmbeddingsClient();
    const queryVector = await embeddings.embedQuery(rewrittenQ);

    // 3) Query Pinecone (updated SDK syntax)
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

    const search = await index.query({
      vector: queryVector,
      topK: 10,
      includeMetadata: true,
      filter: { userId: String(userId) },
    });

    const matches = search.matches || [];

    if (matches.length === 0) {
      return res.json({
        answer: "I couldn't find anything related to your question in your uploaded notes.",
        rewrittenQuestion: rewrittenQ,
        contextChunks: [],
      });
    }

    // 4) Build context
    const context = matches
      .map((m) => m.metadata?.text || "")
      .filter(Boolean)
      .join("\n\n---\n\n");

    // 5) Ask Gemini
    const answer = await answerWithContext([], rewrittenQ, context);

    res.json({
      question,
      rewrittenQuestion: rewrittenQ,
      answer,
      contextChunks: matches,
    });

  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({ error: "Server error processing query" });
  }
});

export default router;
