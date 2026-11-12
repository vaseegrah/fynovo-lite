import mongoose from 'mongoose';

const IdeaSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 3000 },
    category: { type: String, default: 'General', trim: true, maxlength: 40 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: String, default: '' }, // YYYY-MM-DD (calendar date, timezone-free)
    reminder: { type: Boolean, default: true },
    reminderTime: { type: String, default: '' }, // '' = use the user's default time
    status: { type: String, enum: ['new', 'in_execution', 'completed', 'archived'], default: 'new' },
  },
  { timestamps: true }
);
IdeaSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Idea || mongoose.model('Idea', IdeaSchema);
