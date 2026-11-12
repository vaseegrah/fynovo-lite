'use client';
import { useCallback, useEffect, useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { api } from '@/lib/client';
import { useUI } from './Providers';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function toKey(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushSettings() {
  const { toast } = useUI();
  const [state, setState] = useState('checking'); // checking | unsupported | denied | off | on
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('denied');
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub ? 'on' : 'off');
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function enable() {
    if (!VAPID) return toast('Push isn’t configured yet. Add the VAPID keys to .env.local.', { type: 'error' });
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { await navigator.serviceWorker.register('/sw.js'); reg = await navigator.serviceWorker.ready; }
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID) }));
      await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
      setState('on');
      toast('Push notifications enabled 🔔');
    } catch (e) { toast(e.message || 'Could not enable notifications.', { type: 'error' }); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await api('/api/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
      setState('off');
      toast('Push notifications turned off');
    } catch (e) { toast(e.message, { type: 'error' }); }
    finally { setBusy(false); }
  }

  async function test() {
    try { await api('/api/push/test', { method: 'POST' }); toast('Test sent. Check your notification shade.'); }
    catch (e) { toast(e.message, { type: 'error' }); }
  }

  const text = {
    checking: 'Checking…',
    unsupported: 'This browser doesn’t support push notifications. On Android, use Chrome and install the app.',
    denied: 'Notifications are blocked. Allow them in your browser’s site settings, then come back.',
    off: 'Get reminders on this device even when the app is closed.',
    on: 'This device will get due-date and overdue alerts, even when the app is closed.',
  }[state];

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15"><BellRing className="h-5 w-5" /></span>
        <div className="flex-1"><p className="font-semibold">Push notifications</p><p className="text-sm text-ink-soft dark:text-neutral-400">{text}</p></div>
      </div>
      {(state === 'off' || state === 'on') && (
        <div className="mt-3 flex gap-2">
          {state === 'off' ? <button className="btn-primary flex-1" onClick={enable} disabled={busy}>Enable on this device</button> : (
            <>
              <button className="btn-soft flex-1" onClick={test}><Send className="h-4 w-4" />Send test</button>
              <button className="btn-outline flex-1" onClick={disable} disabled={busy}>Turn off</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
