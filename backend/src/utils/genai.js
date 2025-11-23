import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const apiKey = process.env.GEMINI_API_KEY;

// ---------------------------------------------
// GEMINI MAIN CLIENT
// ---------------------------------------------
export const aiClient = new GoogleGenAI({
  apiKey,
});

// ---------------------------------------------
// EMBEDDINGS CLIENT
// ---------------------------------------------
export function makeEmbeddingsClient() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: "text-embedding-004",
  });
}

// ---------------------------------------------
// QUERY REWRITER (Follow-up → standalone)
// ---------------------------------------------
export async function rewriteQuery(history = [], question) {
  try {
    const contents = [
      ...history,
      {
        role: "user",
        parts: [{ text: question }],
      },
    ];

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: `
You are a query rewriting expert. 
Rewrite the user's follow-up question into a complete, standalone question.
Output ONLY the rewritten question, nothing else.
        `,
      },
    });

    return response?.text?.trim() || question;
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
    const contents = [
      ...history,
      {
        role: "user",
        parts: [{ text: question }],
      },
    ];

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: `
You are an expert assistant. 
You must answer ONLY using the information inside the provided Context.

Context:
${context}

If the answer is NOT found in the context, reply:
"I could not find the answer in the provided document."
        `,
      },
    });

    return response?.text?.trim() || "";
  } catch (err) {
    console.error("answerWithContext error:", err);
    return "Error generating answer";
  }
}
