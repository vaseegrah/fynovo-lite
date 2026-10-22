import { Schema, Types, model, models } from "mongoose";

const SyncedTransactionSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, index: true },
  integrationId: { type: Types.ObjectId, required: true, index: true },
  originalTransactionId: { type: String, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  transactionDate: { type: Date, required: true },
  description: String,
  category: String,
  amountMinor: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: String,
  business: { type: String, enum: ["Techvaseegrah", "Vaseegrah Veda", "Vaseegrah Vanam", "Spa Vaseegrah"], default: "Techvaseegrah" },
  status: { type: String, required: true },
  rawPayload: { type: Schema.Types.Mixed, select: false },
}, { timestamps: true });

SyncedTransactionSchema.index({ userId: 1, integrationId: 1, originalTransactionId: 1 }, { unique: true });
export const SyncedTransaction = models.SyncedTransaction || model("SyncedTransaction", SyncedTransactionSchema);
