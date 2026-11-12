import mongoose from 'mongoose';

const DailyGoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    items: [{ text: { type: String, required: true, maxlength: 200 }, done: { type: Boolean, default: false } }],
  },
  { timestamps: true }
);
DailyGoalSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyGoal || mongoose.model('DailyGoal', DailyGoalSchema);
