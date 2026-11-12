export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json } from '@/lib/api';
import { addDays, ymd } from '@/lib/dates';
import Idea from '@/models/Idea';
import ExecutionTask from '@/models/ExecutionTask';

const dayName = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
const monthName = (k) => new Date(`${k}-01T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });

export const GET = route(async (req, ctx, user) => {
  await connectDB();
  const tz = user.timezone;
  const today = ymd(new Date(), tz);
  const [ideas, tasks] = await Promise.all([
    Idea.find({ user: user._id }).lean(),
    ExecutionTask.find({ user: user._id }).lean(),
  ]);

  const active = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const openDates = [...active.map((t) => t.dueDate), ...ideas.filter((i) => i.status === 'new').map((i) => i.dueDate)].filter(Boolean);
  const done = tasks.filter((t) => t.status === 'completed' && t.completedAt);
  const doneDates = done.map((t) => ymd(t.completedAt, tz));
  const createdDates = ideas.map((i) => ymd(i.createdAt, tz));

  const counts = {
    totalIdeas: ideas.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    onHold: tasks.filter((t) => t.status === 'on_hold').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    dueToday: openDates.filter((d) => d === today).length,
    overdue: openDates.filter((d) => d < today).length,
  };

  const completedToday = doneDates.filter((d) => d === today).length;
  const remaining = openDates.filter((d) => d <= today).length;
  const todayPercent = completedToday + remaining ? Math.round((completedToday / (completedToday + remaining)) * 100) : 0;

  // streak: consecutive days with at least one completed task
  const set = new Set(doneDates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1); }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, label: dayName(date), created: createdDates.filter((d) => d === date).length, completed: doneDates.filter((d) => d === date).length };
  });

  const monthKey = today.slice(0, 7);
  const doneThisMonth = done.filter((t) => ymd(t.completedAt, tz).startsWith(monthKey));
  const withDue = doneThisMonth.filter((t) => t.dueDate);
  const onTime = withDue.filter((t) => ymd(t.completedAt, tz) <= t.dueDate).length;
  const openThisMonth = openDates.filter((d) => d.startsWith(monthKey)).length;
  const byCategory = {};
  doneThisMonth.forEach((t) => { const c = t.category || 'General'; byCategory[c] = (byCategory[c] || 0) + 1; });

  const months = Array.from({ length: 6 }, (_, i) => {
    const [y, m] = monthKey.split('-').map(Number);
    const key = new Date(Date.UTC(y, m - 1 - (5 - i), 1)).toISOString().slice(0, 7);
    return {
      key, label: monthName(key),
      created: createdDates.filter((x) => x.startsWith(key)).length,
      completed: doneDates.filter((x) => x.startsWith(key)).length,
    };
  });

  const history = done
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 30)
    .map((t) => ({ _id: t._id, title: t.title, completedAt: t.completedAt, priority: t.priority, category: t.category, dueDate: t.dueDate }));

  return json({
    counts, completedToday, todayPercent, streak, week,
    weekTotals: { created: week.reduce((a, b) => a + b.created, 0), completed: week.reduce((a, b) => a + b.completed, 0) },
    month: {
      key: monthKey,
      created: createdDates.filter((d) => d.startsWith(monthKey)).length,
      completed: doneThisMonth.length,
      completionRate: doneThisMonth.length + openThisMonth ? Math.round((doneThisMonth.length / (doneThisMonth.length + openThisMonth)) * 100) : 0,
      onTimeRate: withDue.length ? Math.round((onTime / withDue.length) * 100) : null,
      byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    },
    months, history,
  });
});
