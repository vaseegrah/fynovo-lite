"use client";

import { useState } from "react";
import { Bell, LoaderCircle, RefreshCw } from "lucide-react";

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4 md:px-8"><div><p className="text-xs font-medium text-brand">{eyebrow || "FINANCE OVERVIEW"}</p><h1 className="mt-0.5 text-xl font-semibold tracking-tight md:text-2xl">{title}</h1></div><div className="flex items-center gap-2">{action}<button aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted"><Bell size={18} /></button></div></header>;
}

export function SyncButton() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const sync = async () => { setBusy(true); setError(null); try { const response = await fetch("/api/integration/sync", { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Synchronization failed."); window.location.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Synchronization failed."); } finally { setBusy(false); } };
  return <div className="flex items-center gap-2"><button onClick={sync} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm hover:bg-slate-50 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} <span className="hidden sm:inline">Sync now</span></button>{error && <span role="alert" className="max-w-52 text-right text-xs text-danger">{error}</span>}</div>;
}
