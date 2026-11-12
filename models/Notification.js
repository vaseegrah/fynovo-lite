import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['due_today', 'overdue', 'upcoming', 'system'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    url: { type: String, default: '/' },
    refType: { type: String, enum: ['idea', 'task', 'none'], default: 'none' },
    refId: { type: mongoose.Schema.Types.ObjectId },
    dedupeKey: { type: String, required: true }, // prevents duplicate reminders
    read: { type: Boolean, default: false },
    popupShown: { type: Boolean, default: false },
    pushSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NotificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });
NotificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
