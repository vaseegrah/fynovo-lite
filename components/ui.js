'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { IDEA_STATUS_LABEL, TASK_STATUS_LABEL } from '@/lib/constants';

export const cx = (...a) => a.filter(Boolean).join(' ');

const PRIORITY = {
  high: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};
export function PriorityBadge({ priority }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize', PRIORITY[priority])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}

const STATUS = {
  new: 'bg-neutral-100 text-ink-soft dark:bg-white/10 dark:text-neutral-300',
  in_execution: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  completed: 'bg-brand-600 text-white',
  archived: 'bg-neutral-100 text-ink-mute dark:bg-white/10',
  pending: 'bg-neutral-100 text-ink-soft dark:bg-white/10 dark:text-neutral-300',
  in_progress: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  on_hold: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};
export function StatusBadge({ status, task = false }) {
  const label = (task ? TASK_STATUS_LABEL : { ...IDEA_STATUS_LABEL, ...TASK_STATUS_LABEL })[status] || status;
  return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', STATUS[status])}>{label}</span>;
}

const TONE = {
  bad: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
  soft: 'text-ink-soft dark:text-neutral-400',
  muted: 'text-ink-mute',
};
export const toneClass = (t) => TONE[t] || TONE.muted;

export function ProgressBar({ value = 0, className }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10', className)}>
      <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-1 text-left">
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-sm text-ink-soft dark:text-neutral-400">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-white/20')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('grid gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-white/10', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('min-h-[40px] rounded-xl px-2 text-sm font-semibold capitalize transition',
            value === o.value ? 'bg-white text-brand-700 shadow-sm dark:bg-brand-600 dark:text-white' : 'text-ink-soft dark:text-neutral-300')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 animate-fade bg-black/45" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-md animate-sheet overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dark:bg-[#12201a]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-white/20" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">{title}</h3>
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Header({ title, subtitle, back, right, className }) {
  const router = useRouter();
  return (
    <header className={cx('sticky top-0 z-30 flex items-center gap-2 bg-white/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-xl dark:bg-[#0b1410]/85', className)}>
      {back && (
        <button className="icon-btn -ml-2" onClick={() => (typeof back === 'string' ? router.push(back) : router.back())} aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-soft dark:text-neutral-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, text, href, action, onAction }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-[260px] text-sm text-ink-soft dark:text-neutral-400">{text}</p>
      {action && (href
        ? <Link href={href} className="btn-primary mt-5">{action}</Link>
        : <button onClick={onAction} className="btn-primary mt-5">{action}</button>)}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-3xl bg-neutral-100 dark:bg-white/10', className)} />;
}
export function ListSkeleton({ n = 3, h = 'h-32' }) {
  return <div className="space-y-3 px-4">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className={h} />)}</div>;
}

export function Logo({ size = 56 }) {
  return (
    <div className="grid place-items-center rounded-[28%] bg-gradient-to-br from-brand-400 to-brand-700 shadow-fab" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
        <path d="m9.7 9.2 1.7 1.7 3-3.2" />
      </svg>
    </div>
  );
}
