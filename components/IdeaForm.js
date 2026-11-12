'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Rocket, X } from 'lucide-react';
import { api, refreshAll, useNow, useUser } from '@/lib/client';
import { setActiveIdea } from '@/lib/active-idea';
import { CATEGORIES } from '@/lib/constants';
import { addDays, formatDate } from '@/lib/dates';
import { playNotificationSound, prepareNotificationSound } from '@/lib/notification-sound';
import { useUI } from './Providers';
import { Header, Segmented, Toggle, cx } from './ui';

export default function IdeaForm({ initial, id, modal = false, onClose }) {
  const router = useRouter();
  const { toast } = useUI();
  const { today, ready } = useNow();
  const { user } = useUser();
  const editing = !!id;
  const [f, setF] = useState({
    title: initial?.title || '', description: initial?.description || '', dueDate: initial?.dueDate || '',
    priority: initial?.priority || 'medium', category: initial?.category || 'General',
    reminder: initial?.reminder ?? true, reminderTime: initial?.reminderTime || '',
  });
  const [custom, setCustom] = useState(initial?.category && !CATEGORIES.includes(initial.category) ? initial.category : '');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [modal, busy, onClose]);

  async function save(thenExecute = false) {
    if (!f.title.trim()) return toast('Please enter a title for your idea.', { type: 'error' });
    if (!editing) prepareNotificationSound();
    setBusy(true);
    try {
      const body = { ...f, category: custom.trim() || f.category };
      const { idea } = await api(editing ? `/api/ideas/${id}` : '/api/ideas', { method: editing ? 'PATCH' : 'POST', body });
      if (!editing) playNotificationSound();
      if (thenExecute) await api(`/api/ideas/${idea._id}/execute`, { method: 'POST' });
      await refreshAll();
      if (!editing) setActiveIdea(idea._id);
      toast(editing ? 'Changes saved' : thenExecute ? 'Idea saved and moved to Execution 🚀' : 'Idea saved 💡');
      if (modal) {
        onClose?.();
        if (thenExecute) router.push('/execution');
      } else {
        router.replace(thenExecute ? '/execution' : editing ? `/ideas/${id}` : '/ideas');
      }
    } catch (e) {
      toast(e.message, { type: 'error' });
      setBusy(false);
    }
  }

  const quick = ready ? [['Today', today], ['Tomorrow', addDays(today, 1)], ['Next week', addDays(today, 7)]] : [];
  const fields = (
    <>
      <div>
        <label className="label" htmlFor="title">Idea title</label>
        <input id="title" className="input !text-lg !font-semibold" autoFocus={!editing} maxLength={200} placeholder="What’s the idea?" value={f.title} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="desc">Description</label>
        <textarea id="desc" className="input min-h-[110px] resize-none" maxLength={3000} placeholder="Add details, links, or the first step…" value={f.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">Created</span>
          <div className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-neutral-50 px-4 text-[15px] font-medium text-ink-soft dark:bg-white/5 dark:text-neutral-300">
            <CalendarPlus className="h-4 w-4" />{editing ? 'Saved' : ready ? formatDate(today) : '…'}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="due">Due date</label>
          <input id="due" type="date" className="input !py-2.5" min={editing ? undefined : today || undefined} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>
      </div>
      <div className="-mt-2 flex gap-2 overflow-x-auto no-scrollbar">
        {quick.map(([label, d]) => <button key={label} type="button" onClick={() => set('dueDate', d)} className={cx('chip', f.dueDate === d && 'chip-on')}>{label}</button>)}
        {f.dueDate && <button type="button" onClick={() => set('dueDate', '')} className="chip">Clear</button>}
      </div>

      <div>
        <span className="label">Priority</span>
        <Segmented value={f.priority} onChange={(v) => set('priority', v)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
      </div>

      <div>
        <span className="label">Category</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => { set('category', c); setCustom(''); }} className={cx('chip', !custom && f.category === c && 'chip-on')}>{c}</button>)}
        </div>
        <input className="input mt-3" placeholder="Or type your own category" maxLength={40} value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>

      <div className="card space-y-3 p-4">
        <Toggle checked={f.reminder} onChange={(v) => set('reminder', v)} label="Remind me" hint="Get notified when it’s due or overdue" />
        {f.reminder && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-white/5">
            <label htmlFor="rt" className="text-sm font-semibold text-ink-soft dark:text-neutral-300">Reminder time</label>
            <input id="rt" type="time" className="input w-full !py-2 sm:!w-auto" value={f.reminderTime || user?.settings?.reminderTime || '09:00'} onChange={(e) => set('reminderTime', e.target.value)} />
          </div>
        )}
      </div>
    </>
  );
  const actions = (
    <>
      <button className="btn-primary w-full !min-h-[52px] text-base" disabled={busy} onClick={() => save(false)}>{editing ? 'Save changes' : 'Save idea'}</button>
      {!editing && <button className="btn-soft w-full" disabled={busy} onClick={() => save(true)}><Rocket className="h-4 w-4" />Save and move to Execution</button>}
    </>
  );

  return (
    modal ? (
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <button className="absolute inset-0 animate-fade bg-black/45" onClick={() => !busy && onClose?.()} aria-label="Close new idea form" />
        <section role="dialog" aria-modal="true" aria-labelledby="create-idea-title" className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white dark:bg-[#12201a]">
          <header className="relative flex items-center justify-between border-b border-neutral-100 px-5 pb-3 pt-7 dark:border-white/5">
            <div className="absolute left-1/2 top-3 h-1.5 w-10 -translate-x-1/2 rounded-full bg-neutral-200 dark:bg-white/20" />
            <h2 id="create-idea-title" className="text-lg font-bold">New idea</h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X className="h-5 w-5" /></button>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5 pt-4">{fields}</div>
          <div className="shrink-0 space-y-2 border-t border-neutral-100 bg-white/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl dark:border-white/5 dark:bg-[#0b1410]/90">
            {actions}
          </div>
        </section>
      </div>
    ) : (
      <div className="flex min-h-[100dvh] flex-col">
        <Header title={editing ? 'Edit idea' : 'New idea'} back />
        <div className="flex-1 space-y-5 px-4 pb-8 pt-2">{fields}</div>
        <div className="sticky bottom-0 space-y-2 border-t border-neutral-100 bg-white/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl dark:border-white/5 dark:bg-[#0b1410]/90">
          {actions}
        </div>
      </div>
    )
  );
}
