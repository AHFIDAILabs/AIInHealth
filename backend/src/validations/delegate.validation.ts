import { z } from 'zod';
import { optionalUrlField } from './common.js';

export const requestAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});
export type RequestAccessCodeInput = z.infer<typeof requestAccessCodeSchema>['body'];

export const verifyAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    code: z.string().trim().min(1, 'Enter your access code'),
  }),
});
export type VerifyAccessCodeInput = z.infer<typeof verifyAccessCodeSchema>['body'];

export const delegatePushSubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().trim().url(),
    keys: z.object({
      p256dh: z.string().trim().min(1),
      auth: z.string().trim().min(1),
    }),
  }),
});
export type DelegatePushSubscribeInput = z.infer<typeof delegatePushSubscribeSchema>['body'];

export const delegatePushUnsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().trim().url(),
  }),
});
export type DelegatePushUnsubscribeInput = z.infer<typeof delegatePushUnsubscribeSchema>['body'];

export const updateDirectoryOptInSchema = z.object({
  body: z.object({
    directoryOptIn: z.boolean(),
  }),
});
export type UpdateDirectoryOptInInput = z.infer<typeof updateDirectoryOptInSchema>['body'];

// Email is deliberately excluded — it's the access-code identity anchor, so changing
// it would need its own re-verification flow, not a plain profile edit.
export const updateDelegateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter your full name').optional(),
    phone: z.string().trim().min(6, 'Enter a valid phone number').optional(),
    organization: z.string().trim().optional(),
    avatarUrl: optionalUrlField,
  }),
});
export type UpdateDelegateProfileInput = z.infer<typeof updateDelegateProfileSchema>['body'];
