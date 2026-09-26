import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { KnowledgeChunk } from '../models/KnowledgeChunk.model.js';
import { recordAudit } from '../services/audit.service.js';
import { embed } from '../services/ai/embeddings.service.js';
import { extractDocumentText } from '../utils/documentText.js';
import { chunkDocumentText } from '../utils/chunkText.js';
import { runInBatches } from '../utils/batch.js';
import {
  createKnowledgeChunkSchema,
  updateKnowledgeChunkSchema,
  listKnowledgeChunksQuerySchema,
  extractKnowledgeChunksSchema,
  bulkCreateKnowledgeChunksSchema,
  type BulkCreateKnowledgeChunksInput,
} from '../validations/ai.validation.js';

// GET /admin/ai/knowledge-chunks — the source material admins manage for
// "Ask the Concept Note" (rag.service.ts). embedding is never sent to the
// frontend — it's a 384-number vector nobody needs to see, just re-embedded
// server-side whenever the text changes.
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listKnowledgeChunksQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (query.sourceDocument) filter.sourceDocument = query.sourceDocument;
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    KnowledgeChunk.find(filter).select('-embedding').sort({ sourceDocument: 1, createdAt: -1 }).skip(skip).limit(query.limit),
    KnowledgeChunk.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createKnowledgeChunkSchema.parse({ body: req.body }).body;
  const embedding = await embed(`${input.sectionHeading ? `${input.sectionHeading}\n` : ''}${input.text}`);
  const chunk = await KnowledgeChunk.create({ ...input, embedding });

  await recordAudit({
    req,
    action: 'knowledgeChunk.created',
    resourceType: 'KnowledgeChunk',
    resourceId: chunk.id,
    after: { sourceDocument: chunk.sourceDocument, sectionHeading: chunk.sectionHeading },
  });

  const { embedding: _omit, ...rest } = chunk.toObject();
  res.status(201).json(new ApiResponse(rest));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Knowledge chunk not found', 'NOT_FOUND');
  const input = updateKnowledgeChunkSchema.parse({ body: req.body }).body;
  const chunk = await KnowledgeChunk.findById(req.params.id);
  if (!chunk) throw new ApiError(404, 'Knowledge chunk not found', 'NOT_FOUND');

  const textChanged = input.text !== undefined && input.text !== chunk.text;
  const headingChanged = input.sectionHeading !== undefined && input.sectionHeading !== chunk.sectionHeading;

  if (input.sourceDocument !== undefined) chunk.sourceDocument = input.sourceDocument;
  if (input.sectionHeading !== undefined) chunk.sectionHeading = input.sectionHeading;
  if (input.text !== undefined) chunk.text = input.text;
  if (input.isActive !== undefined) chunk.isActive = input.isActive;

  // Only re-embed when the actual text/heading changed — re-embedding on
  // every save (e.g. just flipping isActive) would be pure waste.
  if (textChanged || headingChanged) {
    chunk.embedding = await embed(`${chunk.sectionHeading ? `${chunk.sectionHeading}\n` : ''}${chunk.text}`);
  }

  await chunk.save();
  await recordAudit({
    req,
    action: 'knowledgeChunk.updated',
    resourceType: 'KnowledgeChunk',
    resourceId: chunk.id,
    after: { sourceDocument: chunk.sourceDocument, sectionHeading: chunk.sectionHeading, isActive: chunk.isActive },
  });

  const { embedding: _omit, ...rest } = chunk.toObject();
  res.json(new ApiResponse(rest));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Knowledge chunk not found', 'NOT_FOUND');
  const chunk = await KnowledgeChunk.findByIdAndDelete(req.params.id);
  if (!chunk) throw new ApiError(404, 'Knowledge chunk not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'knowledgeChunk.deleted', resourceType: 'KnowledgeChunk', resourceId: req.params.id });
  res.json(new ApiResponse({ id: req.params.id }));
});

// POST /admin/ai/knowledge-chunks/extract — an admin uploads a source
// document (Concept Note, Partnership Prospectus, FAQ...) instead of typing
// each chunk by hand. Text extraction (utils/documentText.ts) and chunking
// (utils/chunkText.ts) are both deterministic, no Groq call — this is a
// text-layout problem, not a language-understanding one. Nothing is saved
// yet: the proposal comes back for the admin to review/edit/deselect in the
// UI, then commit via adminBulkCreate below — same "AI/heuristics draft,
// human approves before it's live" pattern as everywhere else, just with a
// human doing the initial review instead of a second model call.
export const adminExtract = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(422, 'No document was uploaded.', 'NO_FILE');
  const { sourceDocument } = extractKnowledgeChunksSchema.parse({ body: req.body }).body;

  const text = await extractDocumentText(req.file.buffer, req.file.originalname);
  if (text.trim().length === 0) {
    throw new ApiError(422, "Couldn't find any text in that file.", 'NO_TEXT_EXTRACTED');
  }

  const chunks = chunkDocumentText(text);
  if (chunks.length === 0) {
    throw new ApiError(422, 'That document produced no usable chunks — try a different file.', 'NO_CHUNKS');
  }

  res.json(new ApiResponse({ sourceDocument, chunks }));
});

// POST /admin/ai/knowledge-chunks/bulk-create — commits a reviewed proposal
// from /extract. Embedding is CPU-bound local inference (embeddings.service.ts),
// not an external rate-limited call, but still batched (modest concurrency)
// rather than fully parallel so a large document's worth of chunks doesn't
// block the event loop in one long synchronous-ish burst.
export const adminBulkCreate = catchAsync(async (req: Request, res: Response) => {
  const { sourceDocument, chunks }: BulkCreateKnowledgeChunksInput = bulkCreateKnowledgeChunksSchema.parse({
    body: req.body,
  }).body;

  const { succeeded, failed } = await runInBatches(chunks, 2, async (chunk) => {
    const embedding = await embed(`${chunk.sectionHeading ? `${chunk.sectionHeading}\n` : ''}${chunk.text}`);
    await KnowledgeChunk.create({ sourceDocument, sectionHeading: chunk.sectionHeading, text: chunk.text, embedding });
  });

  await recordAudit({
    req,
    action: 'knowledgeChunk.bulkCreated',
    resourceType: 'KnowledgeChunk',
    resourceId: 'bulk',
    after: { sourceDocument, count: succeeded },
  });

  res.status(201).json(
    new ApiResponse({
      created: succeeded,
      failed: failed.length,
    })
  );
});
