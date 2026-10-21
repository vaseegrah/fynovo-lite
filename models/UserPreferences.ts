import { Schema, Types, model, models } from "mongoose";

const UserPreferencesSchema = new Schema({
  userId: { type: Types.ObjectId, required: true, unique: true },
  currency: { type: String, default: "INR" },
  pendingTreatment: { type: String, enum: ["exclude", "include"], default: "exclude" },
  reportStartDay: { type: Number, default: 1, min: 1, max: 28 },
}, { timestamps: true });
export const UserPreferences = models.UserPreferences || model("UserPreferences", UserPreferencesSchema);
