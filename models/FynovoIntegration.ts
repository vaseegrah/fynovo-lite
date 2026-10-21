import { Schema, Types, model, models } from "mongoose";

const FynovoIntegrationSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  baseUrl: { type: String, required: true },
  encryptedApiKey: { type: String, required: true, select: false },
  // Optional so older integrations can be read and backfilled safely.
  apiKeyLast4: { type: String, minlength: 4, maxlength: 4 },
  apiContract: { type: Schema.Types.Mixed },
  syncIntervalMinutes: { type: Number, default: 360, min: 15 },
  lastSyncAt: Date,
  lastSyncStatus: { type: String, enum: ["success", "failed", "running", "never"], default: "never" },
  lastSyncError: String,
}, { timestamps: true });

FynovoIntegrationSchema.index({ userId: 1, baseUrl: 1 }, { unique: true });
export const FynovoIntegration = models.FynovoIntegration || model("FynovoIntegration", FynovoIntegrationSchema);
