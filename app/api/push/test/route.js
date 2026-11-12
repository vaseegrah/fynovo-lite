export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad } from '@/lib/api';
import { pushConfigured, sendPushToUser } from '@/lib/push';

export const POST = route(async (req, ctx, user) => {
  await connectDB();
  if (!pushConfigured()) return bad('Push is not configured on the server (missing VAPID keys).', 501);
  const sent = await sendPushToUser(user._id, {
    title: 'Test notification',
    body: 'Push notifications are working. Time to execute your ideas!',
    url: '/',
    tag: 'test',
  });
  if (!sent) return bad('No active device found. Enable notifications on this device first.');
  return json({ sent });
});
