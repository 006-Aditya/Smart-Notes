import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const apiKey = process.env.GEMINI_API_KEY;

// ---------------------------------------------
// GEMINI MAIN CLIENT
// ---------------------------------------------
export const aiClient = new GoogleGenerativeAI(apiKey);

// ---------------------------------------------
// EMBEDDINGS CLIENT
// ---------------------------------------------
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

export function makeEmbeddingsClient() {
  return new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2", // free local model
  });
}


// ---------------------------------------------
// QUERY REWRITER
// ---------------------------------------------
export async function rewriteQuery(history = [], question) {
  try {
    const model = aiClient.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `
      You are a query rewriting expert.
      Convert the follow-up question into a standalone question.
      Output ONLY the rewritten text without explanation.
      `,
    });

    const parts = [
      ...history.map((msg) => ({ role: msg.role || "user", parts: [{ text: msg.text }] })),
      { role: "user", parts: [{ text: question }] },
    ];

    const result = await model.generateContent({
      contents: parts,
    });

    return (await result.response.text()).trim() || question;
  } catch (err) {
    console.error("rewriteQuery error:", err);
    return question;
  }
}

// ---------------------------------------------
// RAG ANSWER GENERATION USING CONTEXT
// ---------------------------------------------
export async function answerWithContext(history = [], question, context) {
  try {
    const model = aiClient.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `
      You are an expert assistant.
      Answer the user's question ONLY using the provided context below.

      Context:
      ${context}

      If the answer cannot be found in the context, reply with:
      "I could not find the answer in the provided document."
      `,
    });

    const parts = [
      ...history.map((msg) => ({ role: msg.role || "user", parts: [{ text: msg.text }] })),
      { role: "user", parts: [{ text: question }] },
    ];

    const result = await model.generateContent({
      contents: parts,
    });

    return (await result.response.text()).trim();
  } catch (err) {
    console.error("answerWithContext error:", err);
    return "Error generating answer.";
  }
}
