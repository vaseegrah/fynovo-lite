"use client";

import { useState } from "react";
import { LoaderCircle, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { InstallAppButton, RealtimeStatus } from "@/components/pwa-controls";

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <header className="sticky top-0 z-10 flex min-h-[65px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-5 md:px-8"><div className="min-w-0"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-brand">{eyebrow || "FINANCE OVERVIEW"}</p><h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">{title}</h1></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><RealtimeStatus /><InstallAppButton />{action}<Link href="/settings" aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:bg-slate-50 hover:text-ink sm:h-10 sm:w-10"><Settings size={17} /></Link></div></header>;
}

export function SyncButton() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const sync = async () => { setBusy(true); setError(null); try { const response = await fetch("/api/integration/sync", { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Synchronization failed."); window.location.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Synchronization failed."); } finally { setBusy(false); } };
  return <div className="flex items-center gap-2"><button onClick={sync} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm hover:bg-slate-50 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} <span className="hidden sm:inline">Sync now</span></button>{error && <span role="alert" className="max-w-52 text-right text-xs text-danger">{error}</span>}</div>;
}
