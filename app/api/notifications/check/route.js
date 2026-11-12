export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json } from '@/lib/api';
import { runReminders } from '@/lib/reminders';
import Notification from '@/models/Notification';

// Called by the app while it's open: runs this user's reminder check and returns
// notifications that haven't been shown as an in-app popup yet (each shown once).
export const GET = route(async (req, ctx, user) => {
  await connectDB();
  if (user.isGuest) await runReminders({ user });
  else await runReminders({ userId: user._id });
  const popups = await Notification.find({ user: user._id, popupShown: false, read: false }).sort({ createdAt: 1 }).limit(5).lean();
  if (popups.length) await Notification.updateMany({ _id: { $in: popups.map((p) => p._id) } }, { popupShown: true });
  return json({ popups });
});
