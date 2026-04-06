import ollama from "ollama";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

export function makeEmbeddingsClient() {
  return new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-mpnet-base-v2",
  });
}

const MODEL = "ministral-3:3b-cloud";

async function callOllama(prompt) {
  try {
    const response = await ollama.chat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response?.message?.content || "";

  } catch (err) {
    console.error("❌ Ollama SDK error:", err.message);

    return "Sorry, the AI service is temporarily unavailable.";
  }
}

export async function rewriteQuery(history = [], question) {
  try {
    const prompt = `
Rewrite the question into a clear standalone question.
Do NOT add extra information.

Question:
${question}

Standalone Question:
`;

    const result = await callOllama(prompt);

    if (!result || result.trim().length < 5) {
      return question;
    }

    return result.trim();

  } catch (err) {
    console.error("rewriteQuery error:", err);
    return question;
  }
}

export async function answerWithContext(history = [], question, context) {
  try {
    const trimmedContext = context.slice(0, 3000);

    const prompt = `
You are a helpful academic assistant.

Answer ONLY using the provided context.
If the answer is not present, say "Not found in document".

Give a detailed, well-structured explanation:
- Explain concepts clearly
- Include key points
- Add examples if possible from context
- Use paragraphs or bullet points where helpful

CONTEXT:
${trimmedContext}

QUESTION:
${question}

DETAILED ANSWER:
`;

    console.log("🧠 Prompt length:", prompt.length);

    const result = await callOllama(prompt);

    if (!result || result.trim().length === 0) {
      return "No answer generated. Try again.";
    }

    return result.trim();

  } catch (err) {
    console.error("answerWithContext error:", err);
    return "Error generating answer.";
  }
}