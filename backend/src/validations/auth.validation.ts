import { z } from 'zod';
import { NOTIFICATION_EVENTS } from '../types/enums.js';
import { optionalUrlField } from './common.js';

const strongPassword = z
  .string()
  .min(10, 'Must be at least 10 characters')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[0-9]/, 'Must include a number')
  .regex(/[^A-Za-z0-9]/, 'Must include a symbol');

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required'),
    // Controls only the refresh cookie's persistence — see cookies.ts's
    // setAuthCookies for what this actually changes.
    rememberMe: z.boolean().optional().default(false),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1),
      newPassword: strongPassword,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Enter your current password'),
      newPassword: strongPassword,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter your full name').optional(),
    avatarUrl: optionalUrlField,
  }),
});

export const updateNotificationPrefsSchema = z.object({
  body: z.object({
    emailDigest: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    events: z.array(z.enum(NOTIFICATION_EVENTS)).optional(),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>['body'];
