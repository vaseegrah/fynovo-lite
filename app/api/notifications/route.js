export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, body } from '@/lib/api';
import Notification from '@/models/Notification';

export const GET = route(async (req, ctx, user) => {
  await connectDB();
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Notification.countDocuments({ user: user._id, read: false }),
  ]);
  return json({ notifications, unread });
});

// Mark as read: { ids: [...] } or { all: true }
export const PATCH = route(async (req, ctx, user) => {
  await connectDB();
  const b = await body(req);
  const q = { user: user._id };
  if (!b.all) q._id = { $in: Array.isArray(b.ids) ? b.ids : [] };
  await Notification.updateMany(q, { read: true, popupShown: true });
  return json({ ok: true });
});

export const DELETE = route(async (req, ctx, user) => {
  await connectDB();
  await Notification.deleteMany({ user: user._id });
  return json({ ok: true });
});
