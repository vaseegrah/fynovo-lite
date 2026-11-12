import mongoose from 'mongoose';

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  done: { type: Boolean, default: false },
});
const NoteSchema = new mongoose.Schema(
  { text: { type: String, required: true, maxlength: 2000 } },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ExecutionTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    idea: { type: mongoose.Schema.Types.ObjectId, ref: 'Idea', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 3000 },
    category: { type: String, default: 'General' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'on_hold'], default: 'pending' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    subtasks: [SubtaskSchema],
    notes: [NoteSchema],
    reminder: { type: Boolean, default: true },
    reminderTime: { type: String, default: '' },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.ExecutionTask || mongoose.model('ExecutionTask', ExecutionTaskSchema);
