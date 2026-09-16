import { z } from 'zod';

export const createSponsorshipPackageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter a package name'),
    price: z.coerce.number().min(0),
    tierOrder: z.coerce.number().int().optional(),
    benefits: z.array(z.string().trim().min(1)).optional(),
  }),
});

export const updateSponsorshipPackageSchema = z.object({
  body: createSponsorshipPackageSchema.shape.body.partial(),
});

export type CreateSponsorshipPackageInput = z.infer<typeof createSponsorshipPackageSchema>['body'];
export type UpdateSponsorshipPackageInput = z.infer<typeof updateSponsorshipPackageSchema>['body'];
