import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { POLICY_FRAMEWORK_STATUSES, POLICY_ENTRY_STATUSES } from '../types/enums.js';

const objectIdField = z.string().trim().refine(isValidObjectId, 'Invalid id');

// --- Sources (admin-maintained trusted URL list) ---

export const createPolicySourceSchema = z.object({
  body: z.object({
    country: z.string().trim().min(2, "Enter the country's name"),
    label: z.string().trim().min(2, 'Enter a label for this source'),
    url: z.string().trim().url('Enter a valid URL'),
    isActive: z.boolean().optional(),
  }),
});
export const updatePolicySourceSchema = z.object({
  body: createPolicySourceSchema.shape.body.partial(),
});
export const listPolicySourcesQuerySchema = z.object({
  country: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreatePolicySourceInput = z.infer<typeof createPolicySourceSchema>['body'];
export type UpdatePolicySourceInput = z.infer<typeof updatePolicySourceSchema>['body'];
export type ListPolicySourcesQuery = z.infer<typeof listPolicySourcesQuerySchema>;

// --- Entries (AI-drafted, admin-reviewed) ---

// An admin editing and/or reviewing a drafted entry — country/frameworkStatus/
// summary are all correctable before approval, since the job's extraction is
// a first draft, not a guaranteed-correct fact (same "AI drafts, human signs
// off" principle as everywhere else in this feature suite).
export const adminUpdatePolicyEntrySchema = z.object({
  params: z.object({ id: objectIdField }),
  body: z.object({
    country: z.string().trim().min(2).optional(),
    frameworkStatus: z.enum(POLICY_FRAMEWORK_STATUSES).optional(),
    summary: z.string().trim().min(10).max(1500).optional(),
    status: z.enum(POLICY_ENTRY_STATUSES).optional(),
  }),
});

export const listPolicyEntriesQuerySchema = z.object({
  status: z.enum(POLICY_ENTRY_STATUSES).optional(),
  country: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUpdatePolicyEntryInput = z.infer<typeof adminUpdatePolicyEntrySchema>;
export type ListPolicyEntriesQuery = z.infer<typeof listPolicyEntriesQuerySchema>;
