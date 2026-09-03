import { Schema, model, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_EVENTS } from '../types/enums.js';

// One document per event, shared across all staff — "read" state is per-viewer via
// readBy rather than a separate row per recipient, since these are admin-wide
// operational events (a new registration), not personal messages.
const notificationSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_EVENTS, required: true },
    title: { type: String, required: true },
    body: { type: String },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);
