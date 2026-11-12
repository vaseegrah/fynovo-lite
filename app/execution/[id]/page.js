'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Check, Plus, Trash2, X, Lightbulb } from 'lucide-react';
import { api, refreshAll, useNow, useUser } from '@/lib/client';
import { useUI } from '@/components/Providers';
import { formatDate, relativeDue, ymd } from '@/lib/dates';
import { Header, ListSkeleton, ProgressBar, Segmented, Toggle, toneClass } from '@/components/ui';

const STATUS_OPTS = [
  { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'Active' },
  { value: 'completed', label: 'Done' }, { value: 'on_hold', label: 'Hold' },
];

export default function TaskDetail() {
  const { id } = useParams();
  const router = useRouter();
  const key = `/api/tasks/${id}`;
  const { data, error } = useSWR(key, api);
  const { today, tz } = useNow();
  const { user } = useUser();
  const { toast, confirm } = useUI();
  const [subText, setSubText] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const task = data?.task;
  useEffect(() => { if (task) setProgress(task.progress); }, [task?.progress]); // eslint-disable-line

  if (error) return <><Header title="Task" back="/execution" /><p className="px-4 text-sm text-red-600">{error.message}</p></>;
  if (!task || !today) return <><Header title="Task" back="/execution" /><ListSkeleton n={3} h="h-32" /></>;

  const due = relativeDue(task.dueDate, today);
  const hasSubs = task.subtasks.length > 0;

  // optimistic update, then sync with the server
  async function patch(body, optimistic) {
    if (optimistic) mutate(key, { task: { ...task, ...optimistic } }, false);
    try {
      const res = await api(key, { method: 'PATCH', body });
      mutate(key, res, false);
      refreshAll();
      if (body.status === 'completed') toast('Task completed. Great work! 🎉');
      return res.task;
    } catch (e) { toast(e.message, { type: 'error' }); mutate(key); }
  }
  const toggleSub = (sid) => patch({ subtasks: task.subtasks.map((s) => (s._id === sid ? { ...s, done: !s.done } : s)) });
  const addSub = async (e) => {
    e.preventDefault();
    if (!subText.trim()) return;
    await patch({ subtasks: [...task.subtasks, { title: subText.trim(), done: false }] });
    setSubText('');
  };
  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    await patch({ addNote: note.trim() });
    setNote('');
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Remove from Execution?', message: 'The idea goes back to your Ideas list. Notes and subtasks on this task will be lost.', confirmText: 'Remove', danger: true });
    if (!ok) return;
    try { await api(key, { method: 'DELETE' }); await refreshAll(); toast('Moved back to Ideas'); router.replace('/execution'); } catch (e) { toast(e.message, { type: 'error' }); }
  };

  return (
    <>
      <Header title="Task" back="/execution" right={<Link href={`/ideas/${task.idea}`} className="icon-btn" aria-label="View idea"><Lightbulb className="h-5 w-5" /></Link>} />
      <div className="space-y-4 px-4 pb-6">
        <section className="card p-5">
          <h2 className="text-2xl font-extrabold leading-tight">{task.title}</h2>
          {task.description && <p className="mt-2 whitespace-pre-wrap text-[15px] text-ink-soft dark:text-neutral-300">{task.description}</p>}
          <p className={`mt-3 text-sm font-semibold ${task.status === 'completed' ? 'text-brand-700 dark:text-brand-300' : toneClass(due.tone)}`}>
            {task.status === 'completed' ? `Completed ${task.completedAt ? formatDate(ymd(new Date(task.completedAt), tz), true) : ''}` : task.dueDate ? `${formatDate(task.dueDate, true)} · ${due.text}` : 'No due date'}
          </p>
          <div className="mt-5"><Segmented options={STATUS_OPTS} value={task.status} onChange={(status) => patch({ status }, { status })} /></div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">Progress</h3>
            <span className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">{task.status === 'completed' ? 100 : progress}%</span>
          </div>
          {hasSubs || task.status === 'completed' ? (
            <>
              <ProgressBar value={task.progress} className="!h-3" />
              {hasSubs && <p className="mt-2 text-xs text-ink-soft dark:text-neutral-400">Progress follows your subtasks.</p>}
            </>
          ) : (
            <input type="range" min="0" max="100" step="5" value={progress} className="h-8 w-full" aria-label="Progress"
              onChange={(e) => setProgress(+e.target.value)}
              onPointerUp={() => progress !== task.progress && patch({ progress }, { progress })}
              onKeyUp={() => progress !== task.progress && patch({ progress }, { progress })} />
          )}
        </section>

        <section className="card p-5">
          <h3 className="section-title mb-3">Subtasks {hasSubs && <span className="text-sm font-medium text-ink-mute">· {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</span>}</h3>
          <ul className="space-y-1">
            {task.subtasks.map((s) => (
              <li key={s._id} className="flex items-center gap-2">
                <button onClick={() => toggleSub(s._id)} className="flex min-h-[44px] flex-1 items-center gap-3 text-left" aria-pressed={s.done}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${s.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-300 dark:border-white/20'}`}>{s.done && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                  <span className={`text-[15px] ${s.done ? 'text-ink-mute line-through' : ''}`}>{s.title}</span>
                </button>
                <button className="icon-btn" aria-label="Delete subtask" onClick={() => patch({ subtasks: task.subtasks.filter((x) => x._id !== s._id) })}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addSub} className="mt-3 flex gap-2">
            <input className="input" placeholder="Break it into a smaller step" value={subText} onChange={(e) => setSubText(e.target.value)} maxLength={200} />
            <button className="btn-soft !px-4" aria-label="Add subtask"><Plus className="h-5 w-5" /></button>
          </form>
        </section>

        <section className="card p-5">
          <h3 className="section-title mb-3">Notes</h3>
          <form onSubmit={addNote} className="space-y-2">
            <textarea className="input min-h-[84px] resize-none" placeholder="What did you do or learn? Add a note…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
            <button className="btn-soft w-full" disabled={!note.trim()}>Add note</button>
          </form>
          <ul className="mt-4 space-y-3">
            {task.notes.map((n) => (
              <li key={n._id} className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-white/5">
                <p className="whitespace-pre-wrap text-[15px]">{n.text}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-mute">
                  <span>{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  <button onClick={() => patch({ removeNoteId: n._id })} className="font-semibold text-red-500">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="due" className="text-[15px] font-semibold">Due date</label>
            <input id="due" type="date" className="input !w-auto !py-2" value={task.dueDate} onChange={(e) => patch({ dueDate: e.target.value }, { dueDate: e.target.value })} />
          </div>
          <Toggle checked={task.reminder} onChange={(v) => patch({ reminder: v }, { reminder: v })} label="Reminders" hint="Due-date and overdue alerts for this task" />
          {task.reminder && (
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="rt" className="text-[15px] font-semibold">Reminder time</label>
              <input id="rt" type="time" className="input !w-auto !py-2" value={task.reminderTime || user?.settings?.reminderTime || '09:00'} onChange={(e) => patch({ reminderTime: e.target.value }, { reminderTime: e.target.value })} />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3">
          {task.status !== 'completed' && <button className="btn-primary !min-h-[52px] text-base" onClick={() => patch({ status: 'completed' }, { status: 'completed', progress: 100 })}><Check className="h-5 w-5" />Mark as Completed</button>}
          <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" />Remove from Execution</button>
        </div>
      </div>
    </>
  );
}
