import { z } from 'zod';
import { SECURITY_EVENT_TYPES, SECURITY_EVENT_SEVERITIES } from '../types/enums.js';

export const listSecurityEventsQuerySchema = z.object({
  type: z.enum(SECURITY_EVENT_TYPES).optional(),
  severity: z.enum(SECURITY_EVENT_SEVERITIES).optional(),
  ip: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListSecurityEventsQuery = z.infer<typeof listSecurityEventsQuerySchema>;

export const listBlockedIpsQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListBlockedIpsQuery = z.infer<typeof listBlockedIpsQuerySchema>;

// IPv4/IPv6-ish — loose on purpose (req.ip can be a v6-mapped v4 address, a
// bare v6 address, etc.); the real guard against garbage input is that this
// only ever gets written from either req.ip on an actual request or copy-pasted
// by the root admin, not free-form user-facing text.
export const blockIpSchema = z.object({
  body: z.object({
    ip: z.string().trim().min(3).max(64),
    reason: z.string().trim().max(500).optional(),
  }),
});
export type BlockIpInput = z.infer<typeof blockIpSchema>['body'];

export const setLockdownSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
});
export type SetLockdownInput = z.infer<typeof setLockdownSchema>['body'];
