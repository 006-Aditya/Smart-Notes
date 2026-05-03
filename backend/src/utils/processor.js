import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { generateExpectedQuestions } from "./generateQuestions.js";

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "500");
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "100");

export async function processAndUpsert(filePath, filename, userId) {
  try {
    console.log("📄 Loading PDF:", filename);
    
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();
    if (!rawDocs.length) throw new Error("PDF contains no text");

    const cleanDocs = rawDocs.filter(doc =>
      doc.pageContent.length > 200 &&
      !doc.pageContent.toLowerCase().includes("preface")
    );

    // Combine text for question generation
    const combinedText = cleanDocs
      .slice(0, 10) 
      .map(doc => doc.pageContent)
      .join(" ")
      .slice(0, 4000);

    // Generate expected questions using Ollama
    const questions = await generateExpectedQuestions(combinedText) || [];

    console.log("🧠 Generated Questions:", questions.length);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    const chunkedDocs = await splitter.splitDocuments(cleanDocs);

    const embeddings = new HuggingFaceTransformersEmbeddings({
      modelName: "Xenova/all-mpnet-base-v2", // 768-dim
    });

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    const vectorIds = [];

    for (let i = 0; i < chunkedDocs.length; i += 20) {
      const batch = chunkedDocs.slice(i, i + 20);

      const texts = batch.map(doc => doc.pageContent || "");
      const vectorsEmbeddings = await embeddings.embedDocuments(texts);

      console.log("📌 Embedding size:", vectorsEmbeddings[0]?.length);

      const vectors = batch.map((doc, idx) => {
        const id = uuidv4();
        vectorIds.push(id);

        return {
          id,
          values: vectorsEmbeddings[idx],
          metadata: {
            userId: String(userId),
            filename,
            text: doc.pageContent.slice(0, 500),
          },
        };
      });

      await index.namespace(String(userId)).upsert(vectors);
      console.log(`📌 Upserted ${vectors.length} vectors for`, filename);
    }

    fs.unlink(filePath, () => {});
    return {
      vectorIds,
      questions
    };

  } catch (err) {
    console.error("❌ Error processing file:", err);
    throw new Error("Failed to process and upload document");
  }
}
