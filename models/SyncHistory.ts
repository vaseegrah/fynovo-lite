import { Schema, Types, model, models } from "mongoose";

const SyncHistorySchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  integrationId: { type: Types.ObjectId, required: true, index: true },
  status: { type: String, enum: ["success", "failed", "running"], required: true },
  transactionsProcessed: { type: Number, default: 0 },
  error: String,
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
}, { timestamps: true });
export const SyncHistory = models.SyncHistory || model("SyncHistory", SyncHistorySchema);
