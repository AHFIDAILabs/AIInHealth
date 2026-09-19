import { z } from 'zod';

export const createVolunteerTrackSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter a track name'),
    order: z.coerce.number().int().optional(),
  }),
});

export const updateVolunteerTrackSchema = z.object({
  body: createVolunteerTrackSchema.shape.body.partial(),
});

export type CreateVolunteerTrackInput = z.infer<typeof createVolunteerTrackSchema>['body'];
export type UpdateVolunteerTrackInput = z.infer<typeof updateVolunteerTrackSchema>['body'];
