export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad, body } from '@/lib/api';
import PushSubscription from '@/models/PushSubscription';

export const POST = route(async (req, ctx, user) => {
  await connectDB();
  const { subscription } = await body(req);
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return bad('Invalid subscription.');
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { user: user._id, keys: subscription.keys, userAgent: req.headers.get('user-agent') || '' },
    { upsert: true, new: true }
  );
  return json({ ok: true }, 201);
});

export const DELETE = route(async (req, ctx, user) => {
  await connectDB();
  const { endpoint } = await body(req);
  if (endpoint) await PushSubscription.deleteOne({ endpoint, user: user._id });
  return json({ ok: true });
});
