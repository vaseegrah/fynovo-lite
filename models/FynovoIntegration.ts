import { Schema, Types, model, models } from "mongoose";

// Per-brand API key sub-document with separate income and expense base URLs
const BrandIntegrationSchema = new Schema({
  brand: { type: String, required: true, enum: ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Vanam", "Spa Vaseegrah"] },
  baseUrl: { type: String }, // general / fallback
  incomeBaseUrl: { type: String }, // dedicated income endpoint
  expenseBaseUrl: { type: String }, // dedicated expense endpoint
  encryptedApiKey: { type: String, required: true, select: false },
  apiKeyName: { type: String, default: "fynovolive", maxlength: 80 },
  apiKeyPrefix: { type: String, maxlength: 32 },
  apiKeyLast4: { type: String, minlength: 4, maxlength: 4 },
  apiKeyPermissions: { type: [String], default: ["income:read", "expenses:read", "transactions:read"] },
  apiKeyCreatedAt: Date,
  apiKeyExpiresAt: Date,
  apiKeyLastUsedAt: Date,
  apiKeyStatus: { type: String, enum: ["active", "expired", "revoked"], default: "active" },
  syncIntervalMinutes: { type: Number, default: 1440, min: 15 },
  lastSyncAt: Date,
  lastSyncStatus: { type: String, enum: ["success", "failed", "running", "never"], default: "never" },
  lastSyncError: String,
}, { _id: false });

const FynovoIntegrationSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true, unique: true },
  // Legacy single-key fields (kept for backward compatibility)
  baseUrl: { type: String },
  incomeBaseUrl: { type: String },
  expenseBaseUrl: { type: String },
  encryptedApiKey: { type: String, select: false },
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
  // Per-brand API key configurations
  brands: { type: [BrandIntegrationSchema], default: [] },
}, { timestamps: true });

export const FynovoIntegration = models.FynovoIntegration || model("FynovoIntegration", FynovoIntegrationSchema);
