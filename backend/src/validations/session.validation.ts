import { z } from 'zod';
import { SESSION_DAYS, SESSION_FORMATS, TRACKS } from '../types/enums.js';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format');
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const baseSessionShape = {
  day: z.enum(SESSION_DAYS),
  startTime: timeString,
  endTime: timeString,
  title: z.string().trim().min(2, 'Enter a title'),
  track: z.enum(TRACKS),
  format: z.enum(SESSION_FORMATS),
  room: z.string().trim().min(1, 'Enter a room'),
  description: z.string().trim().max(3000).optional(),
  speakers: z.array(objectId).max(20).optional(),
  isPublished: z.boolean().optional(),
};

export const createSessionSchema = z.object({
  body: z
    .object(baseSessionShape)
    .refine((data) => data.endTime > data.startTime, {
      message: 'End time must be after start time',
      path: ['endTime'],
    }),
});

export const updateSessionSchema = z.object({
  body: z.object(baseSessionShape).partial(),
});

export const listSessionsQuerySchema = z.object({
  day: z.enum(SESSION_DAYS).optional(),
  track: z.enum(TRACKS).optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const checkConflictSchema = z.object({
  body: z.object({
    day: z.enum(SESSION_DAYS),
    room: z.string().trim().min(1),
    startTime: timeString,
    endTime: timeString,
    excludeId: objectId.optional(),
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>['body'];
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type CheckConflictInput = z.infer<typeof checkConflictSchema>['body'];
