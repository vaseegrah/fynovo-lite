'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, browserTz, useUser } from '@/lib/client';
import BottomNav from './BottomNav';
import ReminderWatcher from './ReminderWatcher';
import { Logo } from './ui';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, error, mutate } = useUser();

  useEffect(() => { if (error?.status === 401) router.replace('/'); }, [error, router]);
  // keep the server's reminder timezone aligned with this device
  useEffect(() => {
    if (user && user.timezone !== browserTz()) {
      api('/api/auth/me', { method: 'PATCH', body: { timezone: browserTz() } }).then(() => mutate()).catch(() => {});
    }
  }, [user, mutate]);

  if (error && error.status !== 401) {
    return (
      <div className="grid min-h-[100dvh] place-items-center p-8 text-center">
        <div>
          <Logo />
          <h2 className="mt-5 text-lg font-bold">Can’t reach the server</h2>
          <p className="mt-1 text-sm text-ink-soft">{error.message}</p>
          <button className="btn-primary mt-5" onClick={() => mutate()}>Try again</button>
        </div>
      </div>
    );
  }
  if (!user) return <div className="grid min-h-[100dvh] place-items-center"><div className="animate-pulse"><Logo size={64} /></div></div>;

  const formPage = pathname === '/ideas/new' || pathname.endsWith('/edit');
  return (
    <>
      <main className={formPage ? '' : 'pb-[calc(160px+env(safe-area-inset-bottom))]'}>{children}</main>
      {!formPage && <BottomNav />}
      {!user.isGuest && <ReminderWatcher />}
    </>
  );
}
