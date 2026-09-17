import { z } from 'zod';
import { CUSTOM_FORM_TYPES, CUSTOM_FIELD_TYPES } from '../types/enums.js';

export const createCustomFormFieldSchema = z.object({
  body: z
    .object({
      formType: z.enum(CUSTOM_FORM_TYPES),
      label: z.string().trim().min(2, 'Enter a question'),
      fieldType: z.enum(CUSTOM_FIELD_TYPES),
      options: z.array(z.string().trim().min(1)).max(20).optional(),
      required: z.boolean().optional(),
      order: z.coerce.number().int().optional(),
    })
    .refine((data) => data.fieldType !== 'select' || (data.options && data.options.length > 0), {
      message: 'Add at least one option for a select field.',
      path: ['options'],
    }),
});

export const updateCustomFormFieldSchema = z.object({
  body: z.object({
    label: z.string().trim().min(2).optional(),
    fieldType: z.enum(CUSTOM_FIELD_TYPES).optional(),
    options: z.array(z.string().trim().min(1)).max(20).optional(),
    required: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const listCustomFormFieldsQuerySchema = z.object({
  formType: z.enum(CUSTOM_FORM_TYPES),
});

export type CreateCustomFormFieldInput = z.infer<typeof createCustomFormFieldSchema>['body'];
export type UpdateCustomFormFieldInput = z.infer<typeof updateCustomFormFieldSchema>['body'];
