import * as webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

let ready = false;
export function pushConfigured() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  ready = true;
  return true;
}

/** Sends a Web Push message to all of a user's devices. Returns how many succeeded. */
export async function sendPushToUser(userId, payload) {
  if (!pushConfigured()) return 0;
  const subs = await PushSubscription.find({ user: userId });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload));
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await s.deleteOne(); // expired subscription
        else console.error('Push failed:', e.statusCode || e.message);
      }
    })
  );
  return sent;
}
