import { Schema, Types, model, models } from "mongoose";

const SyncedTransactionSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  integrationId: { type: Types.ObjectId, required: true, index: true },
  originalTransactionId: { type: String, required: true },
  // brand tag — set explicitly by the brand sync route so data is always
  // attributed to the correct business regardless of what the API returns.
  brand: { type: String, enum: ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Vanam", "Spa Vaseegrah"], index: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  transactionDate: { type: Date, required: true },
  description: String,
  category: String,
  subcategory: String,
  amountMinor: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: String,
  // business mirrors brand for backward compat with existing dashboard queries
  business: { type: String, enum: ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Vanam", "Spa Vaseegrah"], default: "Techvaseegrah" },
  status: { type: String, required: true },
  rawPayload: { type: Schema.Types.Mixed, select: false },
}, { timestamps: true });

// Unique per user + brand + originalTransactionId so each brand's transactions
// are stored independently even if two brands share an ID in their own API.
SyncedTransactionSchema.index({ userId: 1, brand: 1, originalTransactionId: 1 }, { unique: true });
// Keep the old index as a fallback for legacy records (non-unique)
SyncedTransactionSchema.index({ userId: 1, integrationId: 1, originalTransactionId: 1 });

export const SyncedTransaction = models.SyncedTransaction || model("SyncedTransaction", SyncedTransactionSchema);
