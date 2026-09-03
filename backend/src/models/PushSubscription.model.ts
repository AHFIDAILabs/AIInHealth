import { Schema, model, type InferSchemaType } from 'mongoose';

// One document per browser/device a staff member has opted in on — a user can have
// several (desktop + laptop), so this is keyed by the subscription endpoint, not by user.
const pushSubscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1 });

export type PushSubscriptionDoc = InferSchemaType<typeof pushSubscriptionSchema>;
export const PushSubscription = model('PushSubscription', pushSubscriptionSchema);
