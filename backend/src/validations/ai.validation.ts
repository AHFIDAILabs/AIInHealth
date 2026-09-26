import { z } from 'zod';

export const askQuestionSchema = z.object({
  body: z.object({
    question: z.string().trim().min(3, 'Ask a real question').max(500),
    // Which language to answer IN — the RAG grounding itself is unaffected
    // (see rag.service.ts). Omit for English; this widget's answers are
    // inherently live per-question (unlike the rest of the site's
    // pre-generated translations), so there's nothing to pre-translate here.
    lang: z.enum(['fr', 'pt']).optional(),
  }),
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>['body'];

export const createKnowledgeChunkSchema = z.object({
  body: z.object({
    sourceDocument: z.string().trim().min(2).max(200),
    sectionHeading: z.string().trim().max(200).optional(),
    text: z.string().trim().min(10, 'Enter the chunk text').max(3000),
  }),
});
export type CreateKnowledgeChunkInput = z.infer<typeof createKnowledgeChunkSchema>['body'];

export const updateKnowledgeChunkSchema = z.object({
  body: z.object({
    sourceDocument: z.string().trim().min(2).max(200).optional(),
    sectionHeading: z.string().trim().max(200).optional(),
    text: z.string().trim().min(10).max(3000).optional(),
    isActive: z.boolean().optional(),
  }),
});
export type UpdateKnowledgeChunkInput = z.infer<typeof updateKnowledgeChunkSchema>['body'];

export const listKnowledgeChunksQuerySchema = z.object({
  sourceDocument: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListKnowledgeChunksQuery = z.infer<typeof listKnowledgeChunksQuerySchema>;

// POST /admin/ai/knowledge-chunks/extract — multipart (uploadDocument
// middleware handles the file itself); sourceDocument arrives as a regular
// form field alongside it.
export const extractKnowledgeChunksSchema = z.object({
  body: z.object({
    sourceDocument: z.string().trim().min(2).max(200),
  }),
});
export type ExtractKnowledgeChunksInput = z.infer<typeof extractKnowledgeChunksSchema>['body'];

// POST /admin/ai/knowledge-chunks/bulk-create — committing the reviewed
// proposal from /extract (an admin may have edited/removed entries first).
export const bulkCreateKnowledgeChunksSchema = z.object({
  body: z.object({
    sourceDocument: z.string().trim().min(2).max(200),
    chunks: z
      .array(
        z.object({
          sectionHeading: z.string().trim().max(200).optional(),
          text: z.string().trim().min(10, 'Chunk text is too short').max(3000),
        })
      )
      .min(1, 'Select at least one chunk')
      .max(100, 'Commit 100 or fewer chunks at a time'),
  }),
});
export type BulkCreateKnowledgeChunksInput = z.infer<typeof bulkCreateKnowledgeChunksSchema>['body'];
