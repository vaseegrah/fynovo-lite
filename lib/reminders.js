import { connectDB } from './db';
import { sendPushToUser } from './push';
import { addDays, diffDays, hm, ymd, DEFAULT_TZ } from './dates';
import User from '@/models/User';
import Idea from '@/models/Idea';
import ExecutionTask from '@/models/ExecutionTask';
import Notification from '@/models/Notification';

const MESSAGES = {
  due_today: 'Your task is due today! Time to execute your idea.',
  overdue: 'Your task is overdue. Complete it as soon as possible.',
};

async function processUser(user) {
  const tz = user.timezone || DEFAULT_TZ;
  const now = new Date();
  const today = ymd(now, tz);
  const nowHM = hm(now, tz);
  const s = user.settings || {};
  const defaultTime = s.reminderTime || '09:00';
  const daysBefore = s.upcomingDaysBefore || 1;

  const [tasks, ideas] = await Promise.all([
    ExecutionTask.find({ user: user._id, status: { $in: ['pending', 'in_progress'] }, reminder: true, dueDate: { $nin: ['', null] } }),
    Idea.find({ user: user._id, status: 'new', reminder: true, dueDate: { $nin: ['', null] } }),
  ]);
  const items = [
    ...tasks.map((doc) => ({ kind: 'task', doc })),
    ...ideas.map((doc) => ({ kind: 'idea', doc })),
  ];

  let created = 0;
  for (const { kind, doc } of items) {
    if (nowHM < (doc.reminderTime || defaultTime)) continue; // not time yet today
    const diff = diffDays(doc.dueDate, today);
    let type;
    if (diff === 0) type = 'due_today';
    else if (diff < 0) type = 'overdue';
    else if (s.remindUpcoming !== false && diff <= daysBefore) type = 'upcoming';
    else continue;

    const title =
      type === 'due_today' ? `Due today: ${doc.title}` : type === 'overdue' ? `Overdue: ${doc.title}` : `Coming up: ${doc.title}`;
    const message = MESSAGES[type] || `“${doc.title}” is due ${diff === 1 ? 'tomorrow' : `in ${diff} days`}. Plan your execution.`;
    // Overdue repeats once per day; the others fire once per due date.
    const dedupeKey = `${kind}:${doc._id}:${type}:${type === 'overdue' ? today : doc.dueDate}`;
    const url = kind === 'task' ? `/execution/${doc._id}` : `/ideas/${doc._id}`;

    try {
      const n = await Notification.create({
        user: user._id, type, title, message, url, refType: kind, refId: doc._id, dedupeKey,
      });
      created++;
      const sent = await sendPushToUser(user._id, { title, body: message, url, tag: dedupeKey });
      if (sent) await Notification.updateOne({ _id: n._id }, { pushSent: true });
    } catch (e) {
      if (e.code === 11000) continue; // already notified
      throw e;
    }
  }
  return created;
}

/** Runs the reminder check for one user (in-app) or every user (scheduled job). */
export async function runReminders({ userId, user } = {}) {
  await connectDB();
  const q = { 'settings.remindersEnabled': { $ne: false } };
  if (userId) q._id = userId;
  const users = user ? [user] : await User.find(q);
  let created = 0;
  for (const u of users) created += await processUser(u);
  return { users: users.length, created };
}
