'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CheckCircle2, ChevronUp, Rocket, X } from 'lucide-react';
import { api } from '@/lib/client';
import { ACTIVE_IDEA_EVENT, clearActiveIdea, getActiveIdea } from '@/lib/active-idea';
import { useActions } from '@/lib/actions';
import { ProgressBar, StatusBadge } from './ui';

export default function ActiveIdeaPopup() {
  const router = useRouter();
  const actions = useActions();
  const [ideaId, setIdeaId] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = ideaId ? `/api/ideas/${ideaId}` : null;
  const { data, error, mutate } = useSWR(key, api, { refreshInterval: 5000 });
  const idea = data?.idea;
  const task = data?.task;

  const syncIdea = useCallback(() => {
    setIdeaId(getActiveIdea());
    setMinimized(false);
  }, []);

  useEffect(() => {
    syncIdea();
    window.addEventListener(ACTIVE_IDEA_EVENT, syncIdea);
    window.addEventListener('storage', syncIdea);
    return () => {
      window.removeEventListener(ACTIVE_IDEA_EVENT, syncIdea);
      window.removeEventListener('storage', syncIdea);
    };
  }, [syncIdea]);

  const clearPopup = useCallback(() => {
    clearActiveIdea(ideaId);
    setIdeaId(null);
  }, [ideaId]);

  useEffect(() => {
    if (idea?.status === 'completed' || error?.status === 404 || error?.status === 401) clearPopup();
  }, [idea?.status, error, clearPopup]);

  async function openExecution() {
    if (!idea) return;
    setBusy(true);
    try {
      let activeTask = task;
      if (!activeTask) activeTask = await actions.executeIdea(idea);
      if (activeTask) {
        await mutate();
        setMinimized(true);
        router.push(`/execution/${activeTask._id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!ideaId) return null;

  if (minimized) {
    return (
      <div className="fixed inset-x-0 bottom-[calc(82px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-3 shadow-nav dark:border-brand-500/20 dark:bg-[#12201a]">
          <button type="button" onClick={() => setMinimized(false)} className="min-w-0 flex-1 text-left" aria-label="Show active idea popup">
            <span className="block truncate text-sm font-bold">{idea?.title || 'Idea in progress'}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-ink-soft dark:text-neutral-400">
              {task ? `${task.progress}% complete` : 'Ready for execution'}
              {task && <ProgressBar value={task.progress} className="w-16" />}
            </span>
          </button>
          <button type="button" className="icon-btn" onClick={() => setMinimized(false)} aria-label="Expand idea popup"><ChevronUp className="h-5 w-5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button className="absolute inset-0 animate-fade bg-black/45" onClick={() => setMinimized(true)} aria-label="Minimize idea popup" />
      <section role="dialog" aria-modal="true" aria-labelledby="active-idea-title" className="relative max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dark:bg-[#12201a]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              <CheckCircle2 className="h-4 w-4" /> Idea in progress
            </span>
            <h2 id="active-idea-title" className="break-words text-xl font-extrabold">{idea?.title || 'Loading idea…'}</h2>
          </div>
          <button type="button" className="icon-btn -mr-2 -mt-2 shrink-0" onClick={() => setMinimized(true)} aria-label="Minimize idea popup"><X className="h-5 w-5" /></button>
        </div>

        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{error.message}</p>
            <button type="button" className="btn-outline w-full" onClick={() => mutate()}>Try again</button>
          </div>
        ) : idea ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <StatusBadge status={idea.status} />
              {task && <span className="text-sm font-bold text-brand-700 dark:text-brand-300">{task.progress}% complete</span>}
            </div>
            {task && <ProgressBar value={task.progress} className="mb-4 !h-2.5" />}
            {idea.description && <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft dark:text-neutral-300">{idea.description}</p>}
            {task ? (
              <Link href={`/execution/${task._id}`} onClick={() => setMinimized(true)} className="btn-primary w-full">
                <Rocket className="h-4 w-4" />Open execution
              </Link>
            ) : (
              <button type="button" className="btn-primary w-full" disabled={busy} onClick={openExecution}>
                <Rocket className="h-4 w-4" />{busy ? 'Opening execution…' : 'Move to Execution'}
              </button>
            )}
            <p className="mt-3 text-center text-xs text-ink-mute">This popup stays until the idea is completed. Minimize it to keep working.</p>
          </>
        ) : (
          <div className="h-2 animate-pulse rounded-full bg-neutral-100 dark:bg-white/10" />
        )}
      </section>
    </div>
  );
}
