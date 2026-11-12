'use client';
import Link from 'next/link';
import { Check, ListChecks, Pause, Play, RotateCcw } from 'lucide-react';
import { formatDate, relativeDue, ymd } from '@/lib/dates';
import { PriorityBadge, ProgressBar, toneClass } from './ui';

export default function TaskCard({ task, today, tz, actions }) {
  const done = task.status === 'completed';
  const due = relativeDue(task.dueDate, today);
  const subDone = task.subtasks?.filter((s) => s.done).length || 0;
  return (
    <article className="card p-4">
      <Link href={`/execution/${task._id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-[17px] font-bold leading-snug ${done ? 'text-ink-soft line-through decoration-brand-500/60 dark:text-neutral-400' : ''}`}>{task.title}</h3>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          {done
            ? <span className="font-semibold text-brand-700 dark:text-brand-300">Completed {task.completedAt ? formatDate(ymd(new Date(task.completedAt), tz)) : ''}</span>
            : <span className={`font-semibold ${toneClass(due.tone)}`}>{task.dueDate ? `${formatDate(task.dueDate)} · ${due.text}` : 'No due date'}</span>}
          {task.subtasks?.length > 0 && <span className="inline-flex items-center gap-1 text-ink-soft dark:text-neutral-400"><ListChecks className="h-4 w-4" />{subDone}/{task.subtasks.length}</span>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={task.progress} className="flex-1" />
          <span className="w-10 text-right text-sm font-bold text-brand-700 dark:text-brand-300">{task.progress}%</span>
        </div>
      </Link>

      <div className="mt-4 flex gap-2">
        {(task.status === 'pending') && <button className="btn-primary flex-1" onClick={() => actions.startTask(task)}><Play className="h-4 w-4" />Start Execution</button>}
        {(task.status === 'on_hold') && <button className="btn-primary flex-1" onClick={() => actions.resumeTask(task)}><Play className="h-4 w-4" />Resume</button>}
        {!done && <button className={task.status === 'in_progress' ? 'btn-primary flex-1' : 'btn-outline flex-1'} onClick={() => actions.completeTask(task)}><Check className="h-4 w-4" />Mark as Completed</button>}
        {task.status === 'in_progress' && <button className="icon-btn h-11 w-11 border border-neutral-200 dark:border-white/10" onClick={() => actions.holdTask(task)} aria-label="Put on hold"><Pause className="h-5 w-5" /></button>}
        {done && <button className="btn-outline flex-1" onClick={() => actions.resumeTask(task)}><RotateCcw className="h-4 w-4" />Reopen</button>}
      </div>
    </article>
  );
}
