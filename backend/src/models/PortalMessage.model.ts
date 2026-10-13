import { Schema, model, type InferSchemaType } from 'mongoose';

// One-way admin -> delegate message, shown on the delegate portal's own
// Messages page (PortalMessages.tsx). Distinct from ContactMessage (inbound,
// public contact form) and AdminNotification (the admin-facing bell) — this
// is the one outbound channel a delegate actually sees inside their own
// portal, created by contact.controller.ts's adminReply alongside the real
// email it always sends.
const portalMessageSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Set when this message originated as a reply to an inbound ContactMessage
    // — lets an admin trace it back. Not required: nothing stops a future
    // caller from sending a standalone portal message with no inbound message
    // behind it.
    relatedContactMessage: { type: Schema.Types.ObjectId, ref: 'ContactMessage' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

portalMessageSchema.index({ registration: 1, createdAt: -1 });

export type PortalMessageDoc = InferSchemaType<typeof portalMessageSchema>;
export const PortalMessage = model('PortalMessage', portalMessageSchema);
