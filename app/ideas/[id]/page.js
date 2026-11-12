'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { Archive, ArrowUpRight, CalendarPlus, Flag, Pencil, Rocket, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { api, useNow } from '@/lib/client';
import { useActions } from '@/lib/actions';
import { formatDate, relativeDue, ymd } from '@/lib/dates';
import { Header, ListSkeleton, PriorityBadge, ProgressBar, StatusBadge, toneClass } from '@/components/ui';

export default function IdeaDetails() {
  const { id } = useParams();
  const { data, error } = useSWR(`/api/ideas/${id}`, api);
  const { today, tz } = useNow();
  const actions = useActions();

  if (error) return <><Header title="Idea" back="/ideas" /><p className="px-4 text-sm text-red-600">{error.message}</p></>;
  if (!data || !today) return <><Header title="Idea" back="/ideas" /><ListSkeleton n={2} h="h-40" /></>;
  const { idea, task } = data;
  const due = relativeDue(idea.dueDate, today);
  const open = idea.status === 'new' || idea.status === 'in_execution';

  const Row = ({ icon: Icon, label, children }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="flex items-center gap-2 text-sm text-ink-soft dark:text-neutral-400"><Icon className="h-4 w-4" />{label}</span>
      <span className="text-sm font-semibold">{children}</span>
    </div>
  );

  return (
    <>
      <Header title="Idea details" back="/ideas" />
      <div className="space-y-4 px-4">
        <section className="card p-5">
          <StatusBadge status={idea.status} />
          <h2 className="mt-3 text-2xl font-extrabold leading-tight">{idea.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft dark:text-neutral-300">{idea.description || 'No description added.'}</p>
        </section>

        <section className="card divide-y divide-neutral-100 px-5 dark:divide-white/5">
          <Row icon={CalendarPlus} label="Created">{formatDate(ymd(new Date(idea.createdAt), tz), true)}</Row>
          <Row icon={Flag} label="Due"><span className={open ? toneClass(due.tone) : ''}>{idea.dueDate ? `${formatDate(idea.dueDate, true)}${open ? ` · ${due.text}` : ''}` : 'No due date'}</span></Row>
          <Row icon={Flag} label="Priority"><PriorityBadge priority={idea.priority} /></Row>
          <Row icon={Tag} label="Category">{idea.category}</Row>
          <Row icon={Flag} label="Reminder">{idea.reminder ? 'On' : 'Off'}</Row>
        </section>

        {task && (
          <Link href={`/execution/${task._id}`} className="card block p-5">
            <div className="flex items-center justify-between"><span className="font-bold">Execution progress</span><StatusBadge status={task.status} task /></div>
            <div className="mt-3 flex items-center gap-3"><ProgressBar value={task.progress} className="flex-1" /><span className="text-sm font-bold text-brand-700 dark:text-brand-300">{task.progress}%</span></div>
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">Open task <ArrowUpRight className="h-4 w-4" /></p>
          </Link>
        )}

        <div className="space-y-3 pb-4">
          {idea.status === 'new' && <button className="btn-primary w-full !min-h-[52px]" onClick={() => actions.executeIdea(idea)}><Rocket className="h-5 w-5" />Move to Execution</button>}
          {idea.status === 'completed' && <button className="btn-soft w-full" onClick={() => actions.archiveIdea(idea, true)}><Archive className="h-4 w-4" />Archive idea</button>}
          {idea.status === 'archived' && <button className="btn-soft w-full" onClick={() => actions.archiveIdea(idea, false)}><RotateCcw className="h-4 w-4" />Restore idea</button>}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/ideas/${idea._id}/edit`} className="btn-outline"><Pencil className="h-4 w-4" />Edit</Link>
            <button className="btn-danger" onClick={() => actions.deleteIdea(idea, { redirect: '/ideas' })}><Trash2 className="h-4 w-4" />Delete</button>
          </div>
        </div>
      </div>
    </>
  );
}
