'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SWRConfig } from 'swr';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Sheet } from './ui';

/* ---------------- theme ---------------- */
const ThemeCtx = createContext({ theme: 'system', setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function applyTheme(t) {
  const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/* ---------------- toast + confirm ---------------- */
const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export default function Providers({ children }) {
  const [theme, setThemeState] = useState('system');
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  useEffect(() => {
    const t = localStorage.getItem('ite-theme') || 'system';
    setThemeState(t);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => (localStorage.getItem('ite-theme') || 'system') === 'system' && applyTheme('system');
    mq.addEventListener('change', onChange);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registration failed', e));
    }
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((t) => {
    localStorage.setItem('ite-theme', t);
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toast = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 3200);
  }, []);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })),
    []
  );
  const closeConfirm = (v) => { confirmState?.resolve(v); setConfirmState(null); };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <UICtx.Provider value={{ toast, confirm }}>
        <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 2000, errorRetryCount: 2 }}>
          {children}
        </SWRConfig>

        {/* toasts */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] mx-auto flex max-w-md flex-col gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto flex animate-drop items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-ink">
              {t.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0 text-red-400" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-400" />}
              <span className="flex-1">{t.message}</span>
              {t.href && <Link href={t.href} className="font-bold text-brand-300 dark:text-brand-700">{t.label || 'Open'}</Link>}
            </div>
          ))}
        </div>

        {/* confirm sheet */}
        <Sheet open={!!confirmState} onClose={() => closeConfirm(false)} title={confirmState?.title}>
          <p className="mb-5 text-[15px] text-ink-soft dark:text-neutral-300">{confirmState?.message}</p>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-outline" onClick={() => closeConfirm(false)}>Cancel</button>
            <button className={confirmState?.danger ? 'btn bg-red-600 text-white' : 'btn-primary'} onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || 'Confirm'}
            </button>
          </div>
        </Sheet>
      </UICtx.Provider>
    </ThemeCtx.Provider>
  );
}
