export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad, body } from '@/lib/api';
import { PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import { isDate, isTime } from '@/lib/dates';
import ExecutionTask from '@/models/ExecutionTask';
import Idea from '@/models/Idea';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const subProgress = (subs) => Math.round((subs.filter((s) => s.done).length / subs.length) * 100);

export const GET = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const task = await ExecutionTask.findOne({ _id: id, user: user._id }).lean();
  if (!task) return bad('Task not found', 404);
  return json({ task });
});

export const PATCH = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const task = await ExecutionTask.findOne({ _id: id, user: user._id });
  if (!task) return bad('Task not found', 404);
  const b = await body(req);
  const prev = task.status;

  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t) return bad('Title cannot be empty.');
    task.title = t.slice(0, 200);
  }
  if (b.description !== undefined) task.description = String(b.description).slice(0, 3000);
  if (b.dueDate !== undefined) {
    if (b.dueDate && !isDate(b.dueDate)) return bad('Invalid due date.');
    task.dueDate = b.dueDate || '';
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority)) return bad('Invalid priority.');
    task.priority = b.priority;
  }
  if (b.reminder !== undefined) task.reminder = !!b.reminder;
  if (b.reminderTime !== undefined) {
    if (b.reminderTime && !isTime(b.reminderTime)) return bad('Invalid reminder time.');
    task.reminderTime = b.reminderTime || '';
  }
  if (Array.isArray(b.subtasks)) {
    task.subtasks = b.subtasks
      .slice(0, 50)
      .map((s) => ({ ...(s._id ? { _id: s._id } : {}), title: String(s.title || '').trim().slice(0, 200), done: !!s.done }))
      .filter((s) => s.title);
  }
  if (b.progress !== undefined) task.progress = clamp(Math.round(Number(b.progress) || 0), 0, 100);
  if (Array.isArray(b.subtasks) && task.subtasks.length) task.progress = subProgress(task.subtasks); // subtasks drive progress
  if (b.addNote && String(b.addNote).trim()) task.notes.unshift({ text: String(b.addNote).trim().slice(0, 2000) });
  if (b.removeNoteId) task.notes = task.notes.filter((n) => String(n._id) !== String(b.removeNoteId));

  if (b.status !== undefined) {
    if (!TASK_STATUSES.includes(b.status)) return bad('Invalid status.');
    task.status = b.status;
  } else if (task.status === 'pending' && task.progress > 0) {
    task.status = 'in_progress';
  }

  if (task.status !== prev) {
    if (task.status === 'in_progress' && !task.startedAt) task.startedAt = new Date();
    if (task.status === 'completed') {
      task.progress = 100;
      task.completedAt = new Date();
      if (!task.startedAt) task.startedAt = new Date();
    }
    if (prev === 'completed' && task.status !== 'completed') {
      task.completedAt = undefined;
      const calc = task.subtasks.length ? subProgress(task.subtasks) : 90;
      task.progress = calc >= 100 ? 90 : calc;
    }
  } else if (task.status === 'completed') {
    task.progress = 100;
  }
  await task.save();

  // keep the parent idea's status in sync
  const idea = await Idea.findOne({ _id: task.idea, user: user._id });
  if (idea && idea.status !== 'archived') {
    const next = task.status === 'completed' ? 'completed' : 'in_execution';
    if (idea.status !== next) { idea.status = next; await idea.save(); }
  }
  return json({ task });
});

// Removes a task from execution and returns the idea to the "Captured" state.
export const DELETE = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const task = await ExecutionTask.findOneAndDelete({ _id: id, user: user._id });
  if (!task) return bad('Task not found', 404);
  if (task.status !== 'completed') await Idea.updateOne({ _id: task.idea, user: user._id, status: 'in_execution' }, { status: 'new' });
  return json({ ok: true });
});
