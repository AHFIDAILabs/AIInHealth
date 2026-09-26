import { Schema, model, type InferSchemaType } from 'mongoose';

// Source material for "Ask the Concept Note" (rag.service.ts) — an admin
// writes/pastes each chunk directly (sourceDocument + optional sectionHeading
// + the chunk's own text), rather than uploading a whole document for an
// automatic chunker to split — simpler, more predictable, and the admin
// controls the granularity themselves. embedding is computed by
// embeddings.service.ts whenever text changes (see knowledgeChunk.controller.ts).
//
// No MongoDB Atlas Vector Search index here on purpose — that needs a real
// Atlas Admin API key or UI access this build doesn't have, and at this
// corpus size (a handful of summit documents, realistically dozens to low
// hundreds of chunks) an in-application cosine-similarity scan over every
// active chunk (rag.service.ts) is instant and needs zero external setup.
// Revisit only if the knowledge base grows into the thousands of chunks.
const knowledgeChunkSchema = new Schema(
  {
    sourceDocument: { type: String, required: true, trim: true }, // e.g. 'Concept Note', 'FAQ'
    sectionHeading: { type: String, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 3000 },
    embedding: { type: [Number], required: true }, // 384-dim, Xenova/all-MiniLM-L6-v2
    // Admin can retire a chunk (stale info) without deleting it outright —
    // same soft-hide convention as several other admin-content models.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

knowledgeChunkSchema.index({ isActive: 1, sourceDocument: 1 });

export type KnowledgeChunkDoc = InferSchemaType<typeof knowledgeChunkSchema>;
export const KnowledgeChunk = model('KnowledgeChunk', knowledgeChunkSchema);
