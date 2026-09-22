import { Schema, model, type InferSchemaType } from 'mongoose';

// Replaces the old fixed SESSION_FORMATS enum — an admin can now type a new
// session type inline while creating/editing a session (see
// sessionType.controller.ts's adminCreate) instead of being limited to a
// hardcoded list, and can delete ones no longer needed. Session.format stores
// the name as plain text (validated against this collection in
// session.controller.ts), the same by-name pattern Speaker/Abstract/
// Innovation already use for track — not an ObjectId ref, unlike
// Session.track, since there's no need to populate/join this one anywhere.
const sessionTypeSchema = new Schema(
  {
    // unique: true already creates the index this collection needs.
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

export type SessionTypeDoc = InferSchemaType<typeof sessionTypeSchema>;
export const SessionType = model('SessionType', sessionTypeSchema);
