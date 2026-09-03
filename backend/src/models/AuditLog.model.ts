import { Schema, model, type InferSchemaType } from 'mongoose';

// Every admin mutation gets one of these — actorName/actorRole are denormalized
// snapshots (not just a User ref) so a log entry stays readable even if that staff
// account is later renamed or deactivated.
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "registration.status_changed"
    resourceType: { type: String, required: true }, // e.g. "Registration"
    resourceId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model('AuditLog', auditLogSchema);
