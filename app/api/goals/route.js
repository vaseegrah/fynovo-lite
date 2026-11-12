export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad, body } from '@/lib/api';
import { isDate, ymd } from '@/lib/dates';
import DailyGoal from '@/models/DailyGoal';

export const GET = route(async (req, ctx, user) => {
  await connectDB();
  const date = new URL(req.url).searchParams.get('date') || ymd(new Date(), user.timezone);
  if (!isDate(date)) return bad('Invalid date.');
  const goal = await DailyGoal.findOne({ user: user._id, date }).lean();
  return json({ goal: goal || { date, items: [] } });
});

export const PUT = route(async (req, ctx, user) => {
  await connectDB();
  const b = await body(req);
  if (!isDate(b.date)) return bad('Invalid date.');
  const items = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 20)
    .map((i) => ({ ...(i._id ? { _id: i._id } : {}), text: String(i.text || '').trim().slice(0, 200), done: !!i.done }))
    .filter((i) => i.text);
  const goal = await DailyGoal.findOneAndUpdate({ user: user._id, date: b.date }, { items }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  return json({ goal });
});
