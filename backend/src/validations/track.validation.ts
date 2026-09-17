import { z } from 'zod';

const hexColor = z.string().trim().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Enter a valid hex color, e.g. #E8792C');

export const createTrackSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter a track name'),
    color: hexColor.optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const updateTrackSchema = z.object({
  body: createTrackSchema.shape.body.partial(),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>['body'];
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>['body'];
