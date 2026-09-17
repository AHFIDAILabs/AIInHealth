import { Schema, model, type InferSchemaType } from 'mongoose';
import { CUSTOM_FORM_TYPES, CUSTOM_FIELD_TYPES } from '../types/enums.js';

// Admin-defined extra questions rendered dynamically on the public
// registration form for `formType` (exhibitor only for now — see the enum's
// own comment). An answer to one of these lives in
// Registration.customFieldAnswers, keyed by this document's own _id, so a
// later edit to the question's label/type never touches already-submitted
// answers.
const customFormFieldSchema = new Schema(
  {
    formType: { type: String, enum: CUSTOM_FORM_TYPES, required: true },
    label: { type: String, required: true, trim: true },
    fieldType: { type: String, enum: CUSTOM_FIELD_TYPES, required: true },
    // Only meaningful when fieldType is 'select' — ignored otherwise.
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customFormFieldSchema.index({ formType: 1, order: 1 });

export type CustomFormFieldDoc = InferSchemaType<typeof customFormFieldSchema>;
export const CustomFormField = model('CustomFormField', customFormFieldSchema);
