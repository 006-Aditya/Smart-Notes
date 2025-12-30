import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000");
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "200");

export async function processAndUpsert(filePath, filename, userId) {
  try {
    console.log("📄 Loading PDF:", filename);

    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();
    if (!rawDocs.length) throw new Error("PDF contains no text");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    const chunkedDocs = await splitter.splitDocuments(rawDocs);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "text-embedding-004",
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
        vectorIds.push(id); // 🔥 FIXED!!!

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
    return vectorIds; // now returns actual vector IDs!!

  } catch (err) {
    console.error("❌ Error processing file:", err);
    throw new Error("Failed to process and upload document");
  }
}
