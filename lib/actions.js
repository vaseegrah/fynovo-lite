'use client';
import { useRouter } from 'next/navigation';
import { useUI } from '@/components/Providers';
import { api, refreshAll } from './client';
import { CELEBRATIONS } from './constants';

/** Shared idea/task actions with toasts + confirmations. */
export function useActions() {
  const { toast, confirm } = useUI();
  const router = useRouter();
  const fail = (e) => toast(e.message || 'Something went wrong.', { type: 'error' });

  async function executeIdea(idea) {
    try {
      const { task } = await api(`/api/ideas/${idea._id}/execute`, { method: 'POST' });
      await refreshAll();
      toast('Moved to Execution 🚀', { href: `/execution/${task._id}`, label: 'Open' });
      return task;
    } catch (e) { fail(e); }
  }

  async function deleteIdea(idea, { redirect } = {}) {
    const ok = await confirm({
      title: 'Delete this idea?',
      message: idea.status === 'in_execution' ? 'Its execution task, notes and subtasks will be deleted too.' : 'This can’t be undone.',
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return false;
    try {
      await api(`/api/ideas/${idea._id}`, { method: 'DELETE' });
      await refreshAll();
      toast('Idea deleted');
      if (redirect) router.replace(redirect);
      return true;
    } catch (e) { fail(e); return false; }
  }

  async function archiveIdea(idea, archive = true) {
    try {
      await api(`/api/ideas/${idea._id}`, { method: 'PATCH', body: { action: archive ? 'archive' : 'unarchive' } });
      await refreshAll();
      toast(archive ? 'Idea archived' : 'Idea restored');
    } catch (e) { fail(e); }
  }

  async function updateTask(task, patch, message) {
    try {
      const res = await api(`/api/tasks/${task._id}`, { method: 'PATCH', body: patch });
      await refreshAll();
      if (patch.status === 'completed') toast(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]);
      else if (message) toast(message);
      return res.task;
    } catch (e) { fail(e); }
  }

  const startTask = (t) => updateTask(t, { status: 'in_progress' }, 'Execution started. You’ve got this! 💪');
  const completeTask = (t) => updateTask(t, { status: 'completed' });
  const holdTask = (t) => updateTask(t, { status: 'on_hold' }, 'Task put on hold');
  const resumeTask = (t) => updateTask(t, { status: 'in_progress' }, 'Back in progress');

  return { executeIdea, deleteIdea, archiveIdea, updateTask, startTask, completeTask, holdTask, resumeTask };
}
