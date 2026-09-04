import { z } from 'zod';
import { MEDIA_TYPES, MEDIA_DAYS } from '../types/enums.js';

export const createMediaSchema = z.object({
  body: z.object({
    type: z.enum(MEDIA_TYPES),
    caption: z.string().trim().max(300).optional(),
    url: z.string().trim().url('A valid media URL is required'),
    thumbnailUrl: z.string().trim().url().optional().or(z.literal('')),
    day: z.enum(MEDIA_DAYS).optional(),
    momentLabel: z.string().trim().max(100).optional(),
    isFeatured: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const updateMediaSchema = z.object({
  body: createMediaSchema.shape.body.partial(),
});

export const listMediaQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
  day: z.enum(MEDIA_DAYS).optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMediaInput = z.infer<typeof createMediaSchema>['body'];
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>['body'];
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
