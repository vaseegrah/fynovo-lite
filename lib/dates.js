// Calendar dates are stored as "YYYY-MM-DD" strings so they never shift with timezones.
export const DEFAULT_TZ = 'Asia/Kolkata';

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInTimeZone(locale, date, options, tz) {
  const value = validDate(date);
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(value);
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: DEFAULT_TZ }).format(value);
  }
}

export function ymd(date = new Date(), tz = DEFAULT_TZ) {
  return formatInTimeZone('en-CA', date, { year: 'numeric', month: '2-digit', day: '2-digit' }, tz);
}
export function hm(date = new Date(), tz = DEFAULT_TZ) {
  return formatInTimeZone('en-GB', date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, tz);
}
export function hourIn(date = new Date(), tz = DEFAULT_TZ) {
  return parseInt(hm(date, tz).slice(0, 2), 10);
}
export function addDays(s, n) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function diffDays(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
}
export function formatDate(s, withYear = false) {
  if (!s) return 'No date';
  return new Date(`${s}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });
}
export function formatLong(s) {
  return new Date(`${s}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  });
}
export function monthLabel(key) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
}
export function relativeDue(due, today) {
  if (!due) return { text: 'No due date', tone: 'muted' };
  const d = diffDays(due, today);
  if (d === 0) return { text: 'Due today', tone: 'warn' };
  if (d === 1) return { text: 'Due tomorrow', tone: 'soft' };
  if (d > 1) return { text: `In ${d} days`, tone: 'soft' };
  if (d === -1) return { text: '1 day overdue', tone: 'bad' };
  return { text: `${-d} days overdue`, tone: 'bad' };
}
export function greetingFor(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
export function dayOfYear(s) {
  return diffDays(s, `${s.slice(0, 4)}-01-01`);
}
