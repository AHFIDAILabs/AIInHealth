import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { KnowledgeProduct } from '../models/KnowledgeProduct.model.js';
import { draftKnowledgeProduct } from '../services/ai/knowledgeProduct.service.js';
import { KNOWLEDGE_PRODUCT_TYPES, type KnowledgeProductType } from '../types/enums.js';
import type { AdminUpdateKnowledgeProductInput } from '../validations/knowledgeProduct.validation.js';

// AI Feature Suite 2.9 / Rapporteur spec Section 7. Every handler here works
// off the fixed KNOWLEDGE_PRODUCT_TYPES roster (5 types) rather than whatever
// happens to exist in the collection — a type with no document yet is a real,
// expected state (nothing generated for it so far), not a 404.

const emptyProduct = (type: KnowledgeProductType) => ({
  type,
  sections: [] as { heading: string; content: string }[],
  status: 'draft' as const,
  generatedAt: null,
  generationError: null,
  inputSummary: {},
  approvedAt: null,
});

export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const docs = await KnowledgeProduct.find();
  const byType = new Map(docs.map((d) => [d.type, d]));
  const roster = KNOWLEDGE_PRODUCT_TYPES.map((type) => byType.get(type) ?? emptyProduct(type));
  res.json(new ApiResponse(roster));
});

// POST /admin/knowledge-products/:type/generate — never auto-approves. A
// NO_INPUT_MATERIAL rejection (thrown by the service itself) is a clean
// business rule, not a failure — it's rethrown as-is and nothing is persisted.
// Any OTHER failure (a real Groq/parsing error) is recorded as
// generationError so the admin UI can show "last attempt failed" + Retry,
// without touching whatever sections/status already existed from a prior
// successful draft.
export const adminGenerate = catchAsync(async (req: Request, res: Response) => {
  const type = req.params.type as KnowledgeProductType;

  try {
    const { sections, inputSummary } = await draftKnowledgeProduct(type);
    const doc = await KnowledgeProduct.findOneAndUpdate(
      { type },
      { $set: { sections, inputSummary, generatedAt: new Date(), status: 'draft' }, $unset: { generationError: '' } },
      { upsert: true, new: true }
    );
    res.json(new ApiResponse(doc));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message = err instanceof Error ? err.message : 'AI generation failed';
    await KnowledgeProduct.findOneAndUpdate({ type }, { $set: { generationError: message } }, { upsert: true });
    throw new ApiError(502, 'AI generation failed — see the error below and retry.', 'GENERATION_FAILED');
  }
});

// PATCH /admin/knowledge-products/:type — admin edits sections and/or
// approves. Editing/approving something that's never been generated isn't a
// real state (nothing to edit), so this 404s rather than silently creating
// an empty approved document.
export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  const type = req.params.type as KnowledgeProductType;
  const input = req.body as AdminUpdateKnowledgeProductInput;

  const doc = await KnowledgeProduct.findOne({ type });
  if (!doc) throw new ApiError(404, 'Nothing has been generated for this product yet.', 'NOT_FOUND');

  if (input.sections !== undefined) doc.sections = input.sections as typeof doc.sections;
  if (input.status === 'approved') {
    doc.status = 'approved';
    doc.approvedBy = req.user!.sub as unknown as typeof doc.approvedBy;
    doc.approvedAt = new Date();
  }
  await doc.save();

  res.json(new ApiResponse(doc));
});

// --- Public ---

// GET /knowledge-products — lightweight {type, status} roster so the public
// ParticipantsOutcomes.tsx page knows which of its 5 AI-drafted cards should
// be clickable, without ever exposing draft content publicly.
export const listPublished = catchAsync(async (_req: Request, res: Response) => {
  const docs = await KnowledgeProduct.find().select('type status');
  const statusByType = new Map(docs.map((d) => [d.type, d.status]));
  res.json(
    new ApiResponse(KNOWLEDGE_PRODUCT_TYPES.map((type) => ({ type, status: statusByType.get(type) ?? 'draft' })))
  );
});

// GET /knowledge-products/:type — the finished document, public, only once approved.
export const getPublished = catchAsync(async (req: Request, res: Response) => {
  const type = req.params.type as KnowledgeProductType;
  const doc = await KnowledgeProduct.findOne({ type, status: 'approved' }).select('type sections approvedAt');
  if (!doc) throw new ApiError(404, "This document hasn't been published yet.", 'NOT_FOUND');
  res.json(new ApiResponse(doc));
});
