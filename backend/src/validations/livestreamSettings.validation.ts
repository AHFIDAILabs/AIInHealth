import { z } from 'zod';

// Empty string explicitly allowed (clears a day's link, e.g. before it's
// ready yet) — only a non-empty value is required to actually look like a URL.
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Enter a valid http(s) URL')
  .optional();

export const setLivestreamSettingsSchema = z.object({
  body: z.object({
    isEnabled: z.boolean(),
    day1Url: optionalUrl,
    day2Url: optionalUrl,
  }),
});
export type SetLivestreamSettingsInput = z.infer<typeof setLivestreamSettingsSchema>['body'];
