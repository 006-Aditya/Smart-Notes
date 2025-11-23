import mongoose from "mongoose";

const DocMetaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    pineconeIds: { type: [String], default: [] }, // all vector IDs stored in pinecone
    metadata: { type: Object, default: {} },      // file size, page count, etc.
  },
  { timestamps: true }
);

export default mongoose.model("DocMeta", DocMetaSchema);
