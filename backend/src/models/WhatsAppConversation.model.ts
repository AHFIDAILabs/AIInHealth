import { Schema, model, type InferSchemaType } from 'mongoose';

// One document per WhatsApp sender — `phone` is Twilio's own 'whatsapp:+234...'
// `From` value as-is (never reformatted), since it doubles as the `To` address
// when replying (twilio.service.ts's sendWhatsAppMessage). No bearer
// token/expiry here the way RapporteurAccessToken.model.ts has one — Twilio's
// own request-signature verification (twilio.service.ts) is the auth
// boundary for this feature, not a token stored on this document.
const whatsAppConversationSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    // 'menu': default/idle, showing the numbered menu on the next message.
    // 'awaiting_registration_email'/'awaiting_feedback': the next inbound
    // message is interpreted as that specific answer, not routed through the
    // menu/RAG. 'handed_off': a human was asked for — see handoffRequested.
    state: {
      type: String,
      enum: ['menu', 'awaiting_registration_email', 'awaiting_feedback', 'handed_off'],
      default: 'menu',
    },
    // Set once "check my registration" succeeds (registration.controller.ts's
    // own $or:[{email},{contactEmail}] lookup, reused as-is — see
    // whatsapp.controller.ts). Not re-asked on a later visit.
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    handoffRequested: { type: Boolean, default: false },
    handoffAt: { type: Date },
    // Throttles emitAdminNotification re-fires while already handed off (a
    // chatty visitor shouldn't re-notify staff every message) — see
    // whatsapp.controller.ts's HANDOFF_RENOTIFY_MS.
    lastHandoffNotifiedAt: { type: Date },
    lastMessageAt: { type: Date },
    // Full transcript — this (not just the last message) is what gets shown
    // to staff on handoff, so they don't need the visitor to repeat
    // themselves, same spirit as the AHTS bot's own "I'm passing on our
    // conversation" line. Capped informally by event lifetime, not size —
    // fine at this scale (one short event, text-only messages).
    messages: [
      {
        _id: false,
        direction: { type: String, enum: ['in', 'out'], required: true },
        body: { type: String, required: true, trim: true },
        at: { type: Date, required: true, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

whatsAppConversationSchema.index({ handoffRequested: 1, lastMessageAt: -1 });

export type WhatsAppConversationDoc = InferSchemaType<typeof whatsAppConversationSchema>;
export const WhatsAppConversation = model('WhatsAppConversation', whatsAppConversationSchema);
