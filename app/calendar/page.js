'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Lightbulb, Rocket } from 'lucide-react';
import { useIdeas, useNow, useTasks } from '@/lib/client';
import { Header, ListSkeleton, PriorityBadge, StatusBadge, cx } from '@/components/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function keyForDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthTitle(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
  const { today, ready } = useNow();
  const { ideas, loading: ideasLoading } = useIdeas();
  const { tasks, loading: tasksLoading } = useTasks();
  const initialDate = today ? new Date(`${today}T12:00:00`) : new Date();
  const [month, setMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  useEffect(() => {
    if (today && !selected) setSelected(today);
  }, [today, selected]);

  const events = useMemo(() => {
    const result = new Map();
    (ideas || []).filter((idea) => idea.dueDate).forEach((idea) => {
      const list = result.get(idea.dueDate) || [];
      list.push({ ...idea, kind: 'idea' });
      result.set(idea.dueDate, list);
    });
    (tasks || []).filter((task) => task.dueDate).forEach((task) => {
      const list = result.get(task.dueDate) || [];
      list.push({ ...task, kind: 'task' });
      result.set(task.dueDate, list);
    });
    return result;
  }, [ideas, tasks]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const selectedEvents = events.get(selected) || [];
  const loading = !ready || ideasLoading || tasksLoading;

  const moveMonth = (amount) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <>
      <Header title="Calendar" back="/" subtitle="Ideas and tasks by due date" />
      {loading ? <ListSkeleton n={2} h="h-52" /> : (
        <div className="space-y-4 px-4 pb-8 pt-4">
          <section className="card overflow-hidden p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button type="button" className="icon-btn" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
              <h2 className="text-lg font-bold">{monthTitle(month)}</h2>
              <button type="button" className="icon-btn" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
              {WEEKDAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((date) => {
                const dateKey = keyForDate(date);
                const count = events.get(dateKey)?.length || 0;
                const inMonth = date.getMonth() === month.getMonth();
                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelected(dateKey)}
                    className={cx(
                      'min-h-12 rounded-xl px-1 py-1 text-sm transition sm:min-h-14',
                      inMonth ? 'text-ink' : 'text-muted/50',
                      dateKey === selected && 'bg-brand text-white shadow-sm',
                      dateKey !== selected && dateKey === today && 'ring-2 ring-brand/30',
                      dateKey !== selected && 'hover:bg-brand-soft',
                    )}
                  >
                    <span className="block">{date.getDate()}</span>
                    <span className="mt-1 flex min-h-1.5 justify-center gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }, (_, index) => <i key={index} className={cx('h-1.5 w-1.5 rounded-full', dateKey === selected ? 'bg-white' : 'bg-brand')} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="section-title">Due on {selected === today ? 'today' : selected}</h2>
              {selected !== today && <button type="button" className="text-sm font-semibold text-brand" onClick={() => setSelected(today)}>Today</button>}
            </div>
            {selectedEvents.length === 0 ? (
              <div className="card flex flex-col items-center p-8 text-center">
                <CalendarDays className="h-8 w-8 text-brand" />
                <p className="mt-3 font-semibold">Nothing due</p>
                <p className="mt-1 text-sm text-muted">Create an idea or add a deadline to see it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event) => (
                  <Link key={`${event.kind}-${event._id}`} href={event.kind === 'idea' ? `/ideas/${event._id}` : `/execution/${event._id}`} className="card flex items-center gap-3 p-4 transition hover:border-brand/30">
                    <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', event.kind === 'idea' ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-600')}>
                      {event.kind === 'idea' ? <Lightbulb className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{event.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {event.kind === 'idea' ? <StatusBadge status={event.status} /> : <StatusBadge status={event.status} task />}
                        <PriorityBadge priority={event.priority} />
                      </span>
                    </span>
                    <Flag className="h-4 w-4 shrink-0 text-brand" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
