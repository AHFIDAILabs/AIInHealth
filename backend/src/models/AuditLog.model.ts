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
    // Plain String, not ObjectId — every single-record mutation passes a real
    // ObjectId string here, but a bulk action (exhibitor CSV import, the
    // volunteer CSV import, bulk payment reminders, bulk portal-token sends)
    // has no one resource to point at and passes the literal "batch" instead.
    // An ObjectId-typed field silently fails validation for that literal —
    // recordAudit's own try/catch swallows the error, so every bulk action's
    // audit entry was being dropped without any visible sign of it.
    resourceId: { type: String, required: true },
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
