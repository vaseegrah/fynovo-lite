'use client';
import { Flame, Target, TrendingUp, Trophy } from 'lucide-react';
import { useStats, useNow } from '@/lib/client';
import { formatDate, monthLabel, ymd } from '@/lib/dates';
import { Header, ListSkeleton, PriorityBadge, ProgressBar, cx } from '@/components/ui';

function Bars({ data, max, labelKey = 'label' }) {
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-28 w-full items-end justify-center gap-1">
            <div className="w-full max-w-[14px] rounded-t-md bg-brand-200 dark:bg-brand-500/30" style={{ height: `${Math.max(4, (d.created / max) * 100)}%` }} title={`${d.created} created`} />
            <div className="w-full max-w-[14px] rounded-t-md bg-brand-600" style={{ height: `${Math.max(4, (d.completed / max) * 100)}%` }} title={`${d.completed} completed`} />
          </div>
          <span className="text-[11px] font-medium text-ink-soft dark:text-neutral-400">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}
const Legend = () => (
  <div className="mt-3 flex gap-4 text-xs text-ink-soft dark:text-neutral-400">
    <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-200 dark:bg-brand-500/30" />Ideas created</span>
    <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Completed</span>
  </div>
);

export default function InsightsPage() {
  const { stats: s } = useStats();
  const { tz } = useNow();
  if (!s) return <><Header title="Insights" back="/" /><ListSkeleton n={3} h="h-44" /></>;
  const weekMax = Math.max(1, ...s.week.flatMap((d) => [d.created, d.completed]));
  const monthsMax = Math.max(1, ...s.months.flatMap((d) => [d.created, d.completed]));
  const catMax = Math.max(1, ...s.month.byCategory.map((c) => c.count));

  return (
    <>
      <Header title="Insights" back="/" subtitle="Your productivity at a glance" />
      <div className="space-y-4 px-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[[Flame, s.streak, 'Day streak'], [Trophy, s.counts.completed, 'Completed'], [Target, `${s.todayPercent}%`, 'Today']].map(([Icon, v, l]) => (
            <div key={l} className="card px-3 py-4 text-center"><Icon className="mx-auto h-5 w-5 text-brand-600" /><p className="mt-1.5 text-2xl font-extrabold">{v}</p><p className="text-xs font-medium text-ink-soft dark:text-neutral-400">{l}</p></div>
          ))}
        </div>

        <section className="card p-5">
          <div className="mb-4 flex items-start justify-between">
            <div><h2 className="section-title">Weekly report</h2><p className="text-sm text-ink-soft dark:text-neutral-400">Last 7 days</p></div>
            <p className="text-right text-sm"><b className="text-lg text-brand-700 dark:text-brand-300">{s.weekTotals.completed}</b> done<br /><span className="text-ink-soft dark:text-neutral-400">{s.weekTotals.created} ideas added</span></p>
          </div>
          <Bars data={s.week} max={weekMax} /><Legend />
        </section>

        <section className="card p-5">
          <h2 className="section-title">{monthLabel(s.month.key)}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[['Ideas added', s.month.created], ['Tasks completed', s.month.completed], ['Completion rate', `${s.month.completionRate}%`], ['Finished on time', s.month.onTimeRate == null ? '—' : `${s.month.onTimeRate}%`]].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-white/5"><p className="text-xl font-extrabold">{v}</p><p className="text-xs text-ink-soft dark:text-neutral-400">{l}</p></div>
            ))}
          </div>
          {s.month.byCategory.length > 0 && (
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-bold">Completed by category</h3>
              {s.month.byCategory.slice(0, 5).map((c) => (
                <div key={c.name}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{c.name}</span><span className="text-ink-soft dark:text-neutral-400">{c.count}</span></div><ProgressBar value={(c.count / catMax) * 100} /></div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-600" />Last 6 months</h2>
          <Bars data={s.months} max={monthsMax} /><Legend />
        </section>

        <section>
          <h2 className="section-title mb-2 px-1">Completed history</h2>
          {s.history.length === 0 ? <p className="card p-5 text-center text-sm text-ink-soft dark:text-neutral-400">Finished tasks will appear here.</p> : (
            <div className="card divide-y divide-neutral-100 dark:divide-white/5">
              {s.history.map((h) => (
                <div key={h._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{h.title}</p><p className="text-xs text-ink-soft dark:text-neutral-400">{formatDate(ymd(new Date(h.completedAt), tz), true)} · {h.category}</p></div>
                  <PriorityBadge priority={h.priority} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
