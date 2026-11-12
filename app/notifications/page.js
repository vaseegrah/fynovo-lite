'use client';
import { useRouter } from 'next/navigation';
import { AlarmClock, Bell, BellRing, CalendarClock, CheckCheck, Trash2 } from 'lucide-react';
import { api, refreshAll, useNotifications } from '@/lib/client';
import { useUI } from '@/components/Providers';
import { EmptyState, Header, ListSkeleton, cx } from '@/components/ui';

const META = {
  due_today: { icon: BellRing, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15' },
  overdue: { icon: AlarmClock, tone: 'bg-red-50 text-red-600 dark:bg-red-500/15' },
  upcoming: { icon: CalendarClock, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15' },
  system: { icon: Bell, tone: 'bg-neutral-100 text-ink-soft dark:bg-white/10' },
};
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationsPage() {
  const { notifications, unread, loading } = useNotifications();
  const router = useRouter();
  const { confirm, toast } = useUI();

  const open = async (n) => {
    if (!n.read) api('/api/notifications', { method: 'PATCH', body: { ids: [n._id] } }).then(refreshAll).catch(() => {});
    router.push(n.url || '/');
  };
  const readAll = async () => { await api('/api/notifications', { method: 'PATCH', body: { all: true } }); refreshAll(); };
  const clear = async () => {
    if (!(await confirm({ title: 'Clear history?', message: 'All notifications will be deleted.', confirmText: 'Clear', danger: true }))) return;
    await api('/api/notifications', { method: 'DELETE' }); refreshAll(); toast('Notification history cleared');
  };

  return (
    <>
      <Header title="Notifications" back="/" subtitle={unread ? `${unread} unread` : 'History'}
        right={notifications?.length > 0 && (
          <div className="flex">
            {unread > 0 && <button className="icon-btn" onClick={readAll} aria-label="Mark all as read"><CheckCheck className="h-5 w-5" /></button>}
            <button className="icon-btn text-red-500" onClick={clear} aria-label="Clear history"><Trash2 className="h-5 w-5" /></button>
          </div>
        )} />
      {loading ? <ListSkeleton h="h-20" /> : !notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications yet" text="Due-date and overdue reminders will show up here." />
      ) : (
        <div className="space-y-2.5 px-4">
          {notifications.map((n) => {
            const M = META[n.type] || META.system;
            return (
              <button key={n._id} onClick={() => open(n)} className={cx('card flex w-full items-start gap-3 p-4 text-left', !n.read && 'ring-2 ring-brand-500/25')}>
                <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', M.tone)}><M.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2"><span className="font-bold leading-snug">{n.title}</span>{!n.read && <i className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft dark:text-neutral-400">{n.message}</span>
                  <span className="mt-1 block text-xs text-ink-mute">{ago(n.createdAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
