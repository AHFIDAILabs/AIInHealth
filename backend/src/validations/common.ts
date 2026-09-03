import { z } from 'zod';

// Treats a missing protocol as implicitly https:// — the common real-world case
// where someone types "example.com" instead of "https://example.com". Still
// rejects genuinely malformed input; empty string / undefined both pass through
// (this is always an optional field).
export const optionalUrlField = z
  .string()
  .trim()
  .transform((val) => (val && !/^https?:\/\//i.test(val) ? `https://${val}` : val))
  .pipe(z.union([z.string().url('Enter a valid URL'), z.literal('')]))
  .optional();
