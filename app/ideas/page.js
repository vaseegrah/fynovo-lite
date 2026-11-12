'use client';
import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Search, SlidersHorizontal, X } from 'lucide-react';
import { useIdeas, useNow, useDebounced } from '@/lib/client';
import { useActions } from '@/lib/actions';
import IdeaCard from '@/components/IdeaCard';
import { EmptyState, Header, ListSkeleton, Segmented, Sheet, cx } from '@/components/ui';

const STATUS_CHIPS = [
  { v: 'all', l: 'All' }, { v: 'new', l: 'Captured' }, { v: 'in_execution', l: 'In Execution' },
  { v: 'completed', l: 'Completed' }, { v: 'archived', l: 'Archived' },
];
const PRIO = { high: 0, medium: 1, low: 2 };

export default function IdeasPage() {
  const { ideas, loading, error, mutate } = useIdeas();
  const { today, tz } = useNow();
  const actions = useActions();
  const [q, setQ] = useState('');
  const dq = useDebounced(q).trim().toLowerCase();
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s) setStatus(s);
  }, []);

  const categories = useMemo(() => [...new Set((ideas || []).map((i) => i.category).filter(Boolean))].sort(), [ideas]);
  const list = useMemo(() => {
    let l = (ideas || []).filter((i) => (status === 'all' ? i.status !== 'archived' : i.status === status));
    if (priority !== 'all') l = l.filter((i) => i.priority === priority);
    if (category !== 'all') l = l.filter((i) => i.category === category);
    if (dq) l = l.filter((i) => `${i.title} ${i.description} ${i.category}`.toLowerCase().includes(dq));
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      priority: (a, b) => PRIO[a.priority] - PRIO[b.priority],
    }[sort];
    return [...l].sort(by);
  }, [ideas, status, priority, category, dq, sort]);

  const activeFilters = (priority !== 'all') + (category !== 'all') + (sort !== 'newest');

  return (
    <>
      <Header title="Ideas" subtitle={ideas ? `${ideas.filter((i) => i.status !== 'archived').length} captured` : ' '} />
      <div className="space-y-3 px-4 pb-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
            <input className="input !pl-11 !pr-10" type="search" placeholder="Search ideas" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQ('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </div>
          <button className="btn-outline relative shrink-0 !min-h-[48px] !px-3.5" onClick={() => setSheet(true)} aria-label="Filters and sorting">
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilters > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{activeFilters}</span>}
          </button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {STATUS_CHIPS.map((c) => <button key={c.v} onClick={() => setStatus(c.v)} className={cx('chip', status === c.v && 'chip-on')}>{c.l}</button>)}
        </div>
      </div>

      {error ? (
        <EmptyState icon={Lightbulb} title="Could not load ideas" text={error.message} action="Try again" onAction={() => mutate()} />
      ) : loading || !today ? <ListSkeleton /> : list.length === 0 ? (
        (ideas?.length || 0) === 0
          ? <EmptyState icon={Lightbulb} title="No ideas yet" text="Capture the first thing on your mind. It takes ten seconds." action="Add your first idea" href="/ideas/new" />
          : <EmptyState icon={Search} title="Nothing matches" text="Try a different search or clear your filters." action="Clear filters" onAction={() => { setQ(''); setStatus('all'); setPriority('all'); setCategory('all'); setSort('newest'); }} />
      ) : (
        <div className="space-y-3 px-4">
          {list.map((i) => <IdeaCard key={i._id} idea={i} today={today} tz={tz} onExecute={actions.executeIdea} onDelete={actions.deleteIdea} onArchive={actions.archiveIdea} />)}
        </div>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filter and sort">
        <div className="space-y-5">
          <div><span className="label">Sort by</span>
            <Segmented value={sort} onChange={setSort} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }]} /></div>
          <div><span className="label">Priority</span>
            <Segmented value={priority} onChange={setPriority} options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} /></div>
          <div><span className="label">Category</span>
            <div className="flex flex-wrap gap-2">
              {['all', ...categories].map((c) => <button key={c} onClick={() => setCategory(c)} className={cx('chip capitalize', category === c && 'chip-on')}>{c}</button>)}
            </div></div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button className="btn-outline" onClick={() => { setPriority('all'); setCategory('all'); setSort('newest'); }}>Reset</button>
            <button className="btn-primary" onClick={() => setSheet(false)}>Show {list.length} idea{list.length === 1 ? '' : 's'}</button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
