import { Schema, model, type InferSchemaType } from 'mongoose';
import { ROLES, NOTIFICATION_EVENTS } from '../types/enums.js';

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Populated by uploading a file through upload.controller.ts (POST /admin/uploads/image).
    avatarUrl: { type: String, trim: true },
    role: { type: String, enum: ROLES, required: true },
    // True only for the one account ensureSuperAdminSeeded() creates on first
    // boot — never accepted by createUserSchema/updateUserSchema, so there's
    // no request body path that can set it. Gates the Security Command Center
    // (requireRootAdmin.middleware.ts): role alone can't do this, since any
    // existing super_admin can promote another user to super_admin through
    // ordinary user management, but only the original seed account should
    // ever see security events / block IPs / trigger lockdown.
    isRootAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    notificationPrefs: {
      emailDigest: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: false },
      events: { type: [String], enum: NOTIFICATION_EVENTS, default: [...NOTIFICATION_EVENTS] },
    },
  },
  { timestamps: true }
);

// Set separately (not passed to the Schema constructor) so this plain-JS transform
// can't influence TypeScript's inference of the schema's generic type parameters —
// doing it inline was observed to widen unrelated fields (email, passwordHash) to
// `unknown` throughout every file that reads a UserDoc.
//
// select: false on passwordHash only protects find()/findOne() queries — a document
// returned directly from .create() still carries every field it was constructed
// with. This transform is the backstop: passwordHash never survives JSON
// serialization no matter which code path produced the document.
userSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
