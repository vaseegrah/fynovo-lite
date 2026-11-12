import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    settings: {
      remindersEnabled: { type: Boolean, default: true },
      reminderTime: { type: String, default: '09:00' }, // HH:mm in the user's timezone
      remindUpcoming: { type: Boolean, default: true },
      upcomingDaysBefore: { type: Number, default: 1, min: 1, max: 7 },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export { User };
export default User;
