import { z } from 'zod';
import { KNOWLEDGE_PRODUCT_TYPES } from '../types/enums.js';

export const knowledgeProductTypeParamSchema = z.object({
  params: z.object({ type: z.enum(KNOWLEDGE_PRODUCT_TYPES) }),
});

export const adminUpdateKnowledgeProductSchema = z.object({
  params: z.object({ type: z.enum(KNOWLEDGE_PRODUCT_TYPES) }),
  body: z.object({
    sections: z
      .array(
        z.object({
          heading: z.string().trim().min(1),
          content: z.string(),
        })
      )
      .optional(),
    // Only 'approved' is ever sent by the client — setting a document back to
    // 'draft' isn't a user action, it only happens via a fresh adminGenerate.
    status: z.enum(['approved']).optional(),
  }),
});
export type AdminUpdateKnowledgeProductInput = z.infer<typeof adminUpdateKnowledgeProductSchema>['body'];
