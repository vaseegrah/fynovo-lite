import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

export const User = models.User || model("User", UserSchema);
