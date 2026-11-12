'use client';
import Link from 'next/link';
import { Archive, ArrowUpRight, CalendarPlus, Eye, Flag, Pencil, Rocket, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { formatDate, relativeDue, ymd } from '@/lib/dates';
import { PriorityBadge, StatusBadge, toneClass, cx } from './ui';

export default function IdeaCard({ idea, today, tz, onExecute, onDelete, onArchive }) {
  const closed = idea.status === 'completed' || idea.status === 'archived';
  const due = relativeDue(idea.dueDate, today);
  return (
    <article className="card p-4">
      <Link href={`/ideas/${idea._id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-bold leading-snug">{idea.title}</h3>
          <StatusBadge status={idea.status} />
        </div>
        {idea.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft dark:text-neutral-400">{idea.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-soft dark:text-neutral-400">
          <span className="inline-flex items-center gap-1"><CalendarPlus className="h-4 w-4" />{formatDate(ymd(new Date(idea.createdAt), tz))}</span>
          <span className={cx('inline-flex items-center gap-1 font-semibold', closed ? '' : toneClass(due.tone))}>
            <Flag className="h-4 w-4" />{idea.dueDate ? `${formatDate(idea.dueDate)}${closed ? '' : ` · ${due.text}`}` : 'No due date'}
          </span>
          <PriorityBadge priority={idea.priority} />
          {idea.category && <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{idea.category}</span>}
        </div>
      </Link>

      <div className="mt-4 flex items-center gap-2">
        {idea.status === 'new' && <button className="btn-primary flex-1" onClick={() => onExecute(idea)}><Rocket className="h-4 w-4" />Move to Execution</button>}
        {idea.status === 'in_execution' && <Link href={`/execution/${idea.taskId}`} className="btn-soft flex-1"><ArrowUpRight className="h-4 w-4" />Open execution · {idea.progress}%</Link>}
        {idea.status === 'completed' && <button className="btn-soft flex-1" onClick={() => onArchive(idea, true)}><Archive className="h-4 w-4" />Archive</button>}
        {idea.status === 'archived' && <button className="btn-soft flex-1" onClick={() => onArchive(idea, false)}><RotateCcw className="h-4 w-4" />Restore</button>}
        <Link href={`/ideas/${idea._id}`} className="icon-btn border border-neutral-200 dark:border-white/10" aria-label="View details"><Eye className="h-5 w-5" /></Link>
        <Link href={`/ideas/${idea._id}/edit`} className="icon-btn border border-neutral-200 dark:border-white/10" aria-label="Edit idea"><Pencil className="h-5 w-5" /></Link>
        <button className="icon-btn border border-neutral-200 text-red-500 dark:border-white/10" onClick={() => onDelete(idea)} aria-label="Delete idea"><Trash2 className="h-5 w-5" /></button>
      </div>
    </article>
  );
}
