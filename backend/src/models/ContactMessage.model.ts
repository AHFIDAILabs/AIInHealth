import { Schema, model, type InferSchemaType } from 'mongoose';
import { CONTACT_CATEGORIES } from '../types/enums.js';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, enum: CONTACT_CATEGORIES, required: true },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    isRead: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactMessageSchema.index({ isRead: 1, createdAt: -1 });

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model('ContactMessage', contactMessageSchema);
