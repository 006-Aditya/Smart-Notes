import { pipeline } from "@xenova/transformers";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

/* ---------------------------------------------
   EMBEDDINGS
--------------------------------------------- */
export function makeEmbeddingsClient() {
  return new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-mpnet-base-v2", // ✅ 768-dim
  });
}

/* ---------------------------------------------
   LLM SINGLETON (Flan-T5 Small - ONNX)
--------------------------------------------- */
let textGenPipeline = null;

async function getTextGenerator() {
  if (!textGenPipeline) {
    textGenPipeline = await pipeline(
      "text2text-generation",
      "Xenova/flan-t5-small" 
    );
  }
  return textGenPipeline;
}

/* ---------------------------------------------
   QUERY REWRITER
--------------------------------------------- */
export async function rewriteQuery(history = [], question) {
  try {
    const generator = await getTextGenerator();

    const prompt = `
Rewrite the question into a clear, standalone question.
Do NOT add extra information.

Question:
${question}

Standalone Question:
`;

    const result = await generator(prompt, { max_new_tokens: 64 });
    const rewritten = result[0]?.generated_text?.trim();

    return rewritten && rewritten.length > 5 ? rewritten : question;
  } catch (err) {
    console.error("rewriteQuery error:", err);
    return question;
  }
}

/* ---------------------------------------------
   FINAL RAG ANSWER GENERATION 
--------------------------------------------- */
export async function answerWithContext(history = [], question, context) {
  try {
    const generator = await getTextGenerator();

    const prompt = `
You are a helpful academic assistant.

INSTRUCTIONS (do not repeat these):
- Use your own words
- Do not copy text verbatim
- Do not repeat instructions
- Write a clean, well-structured answer

REFERENCE CONTEXT:
${context}

QUESTION:
${question}

ANSWER (start here):
`;


    const result = await generator(prompt, {
      max_new_tokens: 700,     
      early_stopping: true,    // stop when answer is complete
    });


    return result[0]?.generated_text?.trim() ||
      "I could not find the answer in the provided document.";

  } catch (err) {
    console.error("answerWithContext error:", err);
    return "Error generating answer.";
  }
}
