import { z } from 'zod';

// Mirrors backend/src/validations/common.ts's optionalUrlField — treats a missing
// protocol as implicitly https:// (someone typing "example.com" instead of
// "https://example.com" is the common case, not a mistake worth rejecting).
export const optionalUrlField = z
  .string()
  .trim()
  .transform((val) => (val && !/^https?:\/\//i.test(val) ? `https://${val}` : val))
  .pipe(z.union([z.string().url('Enter a valid URL'), z.literal('')]))
  .optional();
