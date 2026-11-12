'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { AlarmClock, BellRing, CalendarClock } from 'lucide-react';
import { api } from '@/lib/client';
import { prepareNotificationSound, startNotificationSound } from '@/lib/notification-sound';

const ICON = { due_today: BellRing, overdue: AlarmClock, upcoming: CalendarClock, system: BellRing };
const TONE = {
  due_today: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15',
  overdue: 'bg-red-50 text-red-600 dark:bg-red-500/15',
  upcoming: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15',
  system: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15',
};

/** Checks for due / overdue reminders while the app is open and shows an in-app popup (once per reminder). */
export default function ReminderWatcher() {
  const router = useRouter();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const unlockAudio = () => {
      prepareNotificationSound();
    };
    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);

    const check = async () => {
      try {
        const { popups } = await api('/api/notifications/check');
        if (popups?.length) {
          setQueue((q) => [...q, ...popups.filter((p) => !q.some((x) => x._id === p._id))]);
          mutate('/api/notifications');
        }
      } catch (error) {
        console.error('Could not check reminders', error);
      }
    };
    check();
    const id = setInterval(check, 60000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
    };
  }, []);

  const current = queue[0];
  useEffect(() => {
    if (!current || !['due_today', 'overdue'].includes(current.type)) return undefined;
    return startNotificationSound();
  }, [current?._id, current?.type]);

  if (!current) return null;
  const Icon = ICON[current.type] || BellRing;
  const next = () => setQueue((q) => q.slice(1));
  const open = async () => {
    next();
    api('/api/notifications', { method: 'PATCH', body: { ids: [current._id] } }).then(() => mutate('/api/notifications')).catch(() => {});
    router.push(current.url || '/');
  };

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center p-6" role="alertdialog" aria-live="assertive">
      <div className="absolute inset-0 animate-fade bg-black/50" onClick={next} />
      <div className="relative w-full max-w-sm animate-pop rounded-[28px] bg-white p-6 text-center shadow-2xl dark:bg-[#12201a]">
        <div className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl ${TONE[current.type]}`}><Icon className="h-8 w-8" /></div>
        <h3 className="text-lg font-extrabold">{current.title}</h3>
        <p className="mt-2 text-[15px] text-ink-soft dark:text-neutral-300">{current.message}</p>
        {queue.length > 1 && <p className="mt-2 text-xs text-ink-mute">+{queue.length - 1} more reminder{queue.length > 2 ? 's' : ''}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-outline" onClick={next}>Later</button>
          <button className="btn-primary" onClick={open}>Open</button>
        </div>
      </div>
    </div>
  );
}
