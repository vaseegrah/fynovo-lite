'use client';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { ymd, hourIn } from './dates.js';

export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `Something went wrong (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}
const fetcher = (url) => api(url);

/** Revalidate every cached API request (lists, stats, notifications). */
export const refreshAll = () => mutate((k) => typeof k === 'string' && k.startsWith('/api/'));

export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

export function useUser() {
  const r = useSWR('/api/auth/me', fetcher, { shouldRetryOnError: false, revalidateOnFocus: false });
  return { user: r.data?.user, loading: r.isLoading, error: r.error, mutate: r.mutate };
}
export function useIdeas() {
  const r = useSWR('/api/ideas', fetcher);
  return { ideas: r.data?.ideas, loading: r.isLoading, error: r.error, mutate: r.mutate };
}
export function useTasks() {
  const r = useSWR('/api/tasks', fetcher);
  return { tasks: r.data?.tasks, loading: r.isLoading, error: r.error, mutate: r.mutate };
}
export function useStats() {
  const r = useSWR('/api/stats', fetcher);
  return { stats: r.data, loading: r.isLoading, mutate: r.mutate };
}
export function useNotifications() {
  const r = useSWR('/api/notifications', fetcher);
  return { notifications: r.data?.notifications, unread: r.data?.unread || 0, loading: r.isLoading, mutate: r.mutate };
}

/** Today's date / hour on the client. `ready` is false during SSR to avoid hydration mismatches. */
export function useNow() {
  const [s, setS] = useState({ ready: false, today: '', hour: 9, tz: 'Asia/Kolkata' });
  useEffect(() => {
    const tz = browserTz();
    const tick = () => setS({ ready: true, today: ymd(new Date(), tz), hour: hourIn(new Date(), tz), tz });
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return s;
}

export const todayOf = (date, tz) => ymd(new Date(date), tz);

export function useDebounced(value, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
