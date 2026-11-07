import { z } from 'zod';

// Deliberately excludes 'team' — same "not a real attendee-facing total"
// reasoning as analytics.controller.ts's attendee-specific queries. Every
// other confirmed participant type counts, since all of them represent a
// real organization that took part in the Summit.
export const ORGANIZATION_PARTICIPANT_TYPES = ['attendee', 'exhibitor', 'sponsor', 'volunteer', 'innovator'] as const;

export const listOrganizationsQuerySchema = z.object({
  type: z.enum(ORGANIZATION_PARTICIPANT_TYPES).optional(),
  q: z.string().trim().max(200).optional(),
});
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
