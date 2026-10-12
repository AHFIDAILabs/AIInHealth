import { z } from 'zod';
import { optionalUrlField } from './common.js';

// Email-only login — no code to request/verify. Logs straight into the
// portal for any confirmed, active registration matching this email (see
// delegate.controller.ts's login for why this is deliberately NOT
// enumeration-safe: it's the one piece of actual feedback a person gets if
// they mistyped their email or aren't registered yet).
export const delegateLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});
export type DelegateLoginInput = z.infer<typeof delegateLoginSchema>['body'];

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
