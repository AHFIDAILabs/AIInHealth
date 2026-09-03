import { Schema, model, type InferSchemaType } from 'mongoose';

// Mirrors PushSubscription.model.ts, keyed by Registration instead of admin User.
const delegatePushSubscriptionSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

delegatePushSubscriptionSchema.index({ registration: 1 });

export type DelegatePushSubscriptionDoc = InferSchemaType<typeof delegatePushSubscriptionSchema>;
export const DelegatePushSubscription = model('DelegatePushSubscription', delegatePushSubscriptionSchema);
