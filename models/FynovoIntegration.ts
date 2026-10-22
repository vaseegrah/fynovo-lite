import { Schema, Types, model, models } from "mongoose";

const FynovoIntegrationSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  baseUrl: { type: String, required: true },
  encryptedApiKey: { type: String, required: true, select: false },
  // Optional so older integrations can be read and backfilled safely.
  apiKeyName: { type: String, default: "fynovolive", maxlength: 80 },
  apiKeyPrefix: { type: String, maxlength: 32 },
  apiKeyLast4: { type: String, minlength: 4, maxlength: 4 },
  apiKeyPermissions: { type: [String], default: ["income:read", "expenses:read", "transactions:read"] },
  apiKeyCreatedAt: Date,
  apiKeyExpiresAt: Date,
  apiKeyLastUsedAt: Date,
  apiKeyStatus: { type: String, enum: ["active", "expired", "revoked"], default: "active" },
  apiContract: { type: Schema.Types.Mixed },
  syncIntervalMinutes: { type: Number, default: 1440, min: 15 },
  lastSyncAt: Date,
  lastSyncStatus: { type: String, enum: ["success", "failed", "running", "never"], default: "never" },
  lastSyncError: String,
}, { timestamps: true });

FynovoIntegrationSchema.index({ userId: 1, baseUrl: 1 }, { unique: true });
export const FynovoIntegration = models.FynovoIntegration || model("FynovoIntegration", FynovoIntegrationSchema);
