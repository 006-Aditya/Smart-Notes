import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000");
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "200");

export async function processAndUpsert(filePath, filename, userId) {
  try {
    // 1️⃣ Load PDF
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();

    if (!rawDocs || rawDocs.length === 0) {
      throw new Error("PDF contains no text");
    }

    // 2️⃣ Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    const chunkedDocs = await splitter.splitDocuments(rawDocs);

    // 3️⃣ Gemini Embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "text-embedding-004",
    });

    // 4️⃣ Pinecone Init (FIXED)
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

    const vectorIds = [];

    // 5️⃣ Batch create embeddings
    for (let i = 0; i < chunkedDocs.length; i += 20) {
      const batch = chunkedDocs.slice(i, i + 20);

      const vectors = await Promise.all(
        batch.map(async (doc) => {
          const text = doc.pageContent || "";

          const embedding = await embeddings.embedQuery(text);

          const vectorId = uuidv4();
          vectorIds.push(vectorId);

          return {
            id: vectorId,
            values: embedding,
            metadata: {
              userId: String(userId),
              filename,
              text: text.slice(0, 500),
            },
          };
        })
      );

      // 6️⃣ Upsert (FIXED FORMAT)
      await index.upsert(vectors);
    }

    // 7️⃣ Cleanup
    fs.unlink(filePath, () => {});

    return vectorIds;
  } catch (err) {
    console.error("❌ Error processing file:", err);
    throw new Error("Failed to process and upload document");
  }
}
