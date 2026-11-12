'use client';
import { useEffect, useMemo, useState } from 'react';
import { Rocket } from 'lucide-react';
import { useNow, useTasks } from '@/lib/client';
import { useActions } from '@/lib/actions';
import TaskCard from '@/components/TaskCard';
import { EmptyState, Header, ListSkeleton, cx } from '@/components/ui';

const TABS = [
  { v: 'pending', l: 'Pending' }, { v: 'in_progress', l: 'In Progress' },
  { v: 'completed', l: 'Completed' }, { v: 'on_hold', l: 'On Hold' },
];
const EMPTY = {
  pending: ['Nothing waiting', 'Move an idea to Execution to see it here.'],
  in_progress: ['Nothing in progress', 'Start a pending task and it will show up here.'],
  completed: ['No completed tasks yet', 'Finish a task and it will be saved in your history.'],
  on_hold: ['Nothing on hold', 'Pause a task when it needs to wait.'],
};

export default function ExecutionPage() {
  const { tasks, loading, error, mutate } = useTasks();
  const { today, tz } = useNow();
  const actions = useActions();
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((x) => x.v === t)) setTab(t);
  }, []);

  const groups = useMemo(() => {
    const g = { pending: [], in_progress: [], completed: [], on_hold: [] };
    (tasks || []).forEach((t) => g[t.status]?.push(t));
    const byDue = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    g.pending.sort(byDue); g.in_progress.sort(byDue); g.on_hold.sort(byDue);
    g.completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return g;
  }, [tasks]);

  const list = groups[tab];
  return (
    <>
      <Header title="Execution" subtitle="Turn ideas into finished work" />
      <div className="sticky top-[calc(env(safe-area-inset-top)+68px)] z-20 bg-white/90 px-4 pb-3 backdrop-blur-xl dark:bg-[#0b1410]/90">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-white/10">
          {TABS.map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)} className={cx('flex min-h-[48px] flex-col items-center justify-center rounded-xl text-[12px] font-semibold leading-tight transition',
              tab === t.v ? 'bg-white text-brand-700 shadow-sm dark:bg-brand-600 dark:text-white' : 'text-ink-soft dark:text-neutral-300')}>
              <span>{t.l}</span>
              <span className={cx('text-[11px]', tab === t.v ? 'opacity-90' : 'opacity-60')}>{groups[t.v].length}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <EmptyState icon={Rocket} title="Could not load tasks" text={error.message} action="Try again" onAction={() => mutate()} />
      ) : loading || !today ? <ListSkeleton /> : list.length === 0 ? (
        <EmptyState icon={Rocket} title={EMPTY[tab][0]} text={EMPTY[tab][1]} action={tab === 'pending' ? 'Go to Ideas' : undefined} href="/ideas" />
      ) : (
        <div className="space-y-3 px-4 pt-1">
          {list.map((t) => <TaskCard key={t._id} task={t} today={today} tz={tz} actions={actions} />)}
        </div>
      )}
    </>
  );
}
