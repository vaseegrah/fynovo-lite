import { PRIORITIES } from './constants';
import { isDate, isTime } from './dates';

/** Validates idea fields. Returns { data } with only the provided fields, or { error }. */
export function ideaFields(b, requireTitle = false) {
  const d = {};
  if (b.title !== undefined || requireTitle) {
    const t = String(b.title ?? '').trim();
    if (!t) return { error: 'Please enter a title for your idea.' };
    d.title = t.slice(0, 200);
  }
  if (b.description !== undefined) d.description = String(b.description).slice(0, 3000);
  if (b.dueDate !== undefined) {
    if (b.dueDate && !isDate(b.dueDate)) return { error: 'Invalid due date.' };
    d.dueDate = b.dueDate || '';
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority)) return { error: 'Invalid priority.' };
    d.priority = b.priority;
  }
  if (b.category !== undefined) d.category = String(b.category).trim().slice(0, 40) || 'General';
  if (b.reminder !== undefined) d.reminder = !!b.reminder;
  if (b.reminderTime !== undefined) {
    if (b.reminderTime && !isTime(b.reminderTime)) return { error: 'Invalid reminder time.' };
    d.reminderTime = b.reminderTime || '';
  }
  return { data: d };
}
