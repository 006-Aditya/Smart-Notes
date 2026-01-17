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

    const userId = req.user.id.toString();

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    /* ---------------------------------
       1️⃣ Rewrite question
    ---------------------------------- */
    const rewrittenQ = await rewriteQuery([], question);

    /* ---------------------------------
       2️⃣ Generate embedding
    ---------------------------------- */
    const embeddings = makeEmbeddingsClient();
    const [queryVector] = await embeddings.embedDocuments([rewrittenQ]);

    /* ---------------------------------
       3️⃣ Pinecone Search
    ---------------------------------- */
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

    /* ---------------------------------
       4️⃣ FILTER + LIMIT 
    ---------------------------------- */
    const filteredChunks = matches
      .filter(m => m.score >= 0.3)   // similarity 
      .slice(0, 5);                 

    if (!filteredChunks.length) {
      return res.json({
        answer:
          "The answer is not clearly available in the uploaded document.",
        rewrittenQuestion: rewrittenQ,
        contextChunks: [],
      });
    }

    /* ---------------------------------
       5️⃣ Build RAG context
    ---------------------------------- */
    const context = filteredChunks
      .map(
        (m, i) => `Source ${i + 1}:\n${m.metadata?.text ?? ""}`
      )
      .join("\n\n");

    /* ---------------------------------
       6️⃣ Generate final answer
    ---------------------------------- */
    const answer = await answerWithContext([], rewrittenQ, context);

    /* ---------------------------------
       7️⃣ Send response
    ---------------------------------- */
    return res.json({
      question,
      rewrittenQuestion: rewrittenQ,
      answer,
      contextChunks: filteredChunks,
    });

  } catch (err) {
    console.error("❌ Query Error:", err);
    return res.status(500).json({ error: "Server error processing query" });
  }
});

export default router;
