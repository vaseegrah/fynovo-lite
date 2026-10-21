import { Schema, Types, model, models } from "mongoose";

const AuditLogSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  action: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
export const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);
