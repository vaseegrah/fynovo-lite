'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Check, Plus, Target, X } from 'lucide-react';
import { api } from '@/lib/client';
import { useUI } from './Providers';

export default function GoalsCard({ date }) {
  const key = `/api/goals?date=${date}`;
  const { data } = useSWR(key, api);
  const { toast } = useUI();
  const [text, setText] = useState('');
  const items = data?.goal?.items || [];

  async function save(next) {
    mutate(key, { goal: { date, items: next } }, false);
    try {
      const res = await api('/api/goals', { method: 'PUT', body: { date, items: next } });
      mutate(key, res, false);
    } catch (e) { toast(e.message, { type: 'error' }); mutate(key); }
  }
  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    save([...items, { text: text.trim(), done: false }]);
    setText('');
  };
  const done = items.filter((i) => i.done).length;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2"><Target className="h-5 w-5 text-brand-600" />Today’s goals</h2>
        {items.length > 0 && <span className="text-sm font-semibold text-ink-soft dark:text-neutral-400">{done}/{items.length}</span>}
      </div>
      <ul className="space-y-0.5">
        {items.map((g, i) => (
          <li key={g._id || i} className="flex items-center gap-1">
            <button className="flex min-h-[44px] flex-1 items-center gap-3 text-left" aria-pressed={g.done}
              onClick={() => save(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${g.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-300 dark:border-white/20'}`}>{g.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className={`text-[15px] ${g.done ? 'text-ink-mute line-through' : ''}`}>{g.text}</span>
            </button>
            <button className="icon-btn" aria-label="Remove goal" onClick={() => save(items.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input className="input" placeholder={items.length ? 'Add another goal' : 'What do you want to finish today?'} value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
        <button className="btn-soft !px-4" aria-label="Add goal"><Plus className="h-5 w-5" /></button>
      </form>
    </section>
  );
}
