"use client";

import { type FormEvent, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { IntegrationPublicData } from "@/types/financial";
import type { PreferencesData } from "@/services/preferences-service";

const defaultPermissions = ["income:read", "expenses:read", "transactions:read"];
type SettingsData = IntegrationPublicData & { history: { id: string; status: string; startedAt: string; error?: string; transactionsProcessed: number }[] };
type ApiKeyRecord = { name: string; prefix?: string; last4?: string; permissions: string[]; createdAt?: string; lastUsedAt?: string; expiresAt?: string; status: "active" | "expired" | "revoked" };

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "Not used yet";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SettingsPage({ integration, preferences }: { integration: SettingsData; preferences: PreferencesData }) {
  const [baseUrl, setBaseUrl] = useState(integration.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState(integration.apiKeyName || "fynovolive");
  const [apiKeyLast4, setApiKeyLast4] = useState(integration.apiKeyLast4 || null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [interval, setInterval] = useState(String(integration.syncIntervalMinutes || 1440));
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "sync" | null>(null);
  const [currency, setCurrency] = useState(preferences.currency);
  const [pendingTreatment, setPendingTreatment] = useState(preferences.pendingTreatment);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [keyRecord, setKeyRecord] = useState<ApiKeyRecord | null>(integration.configured && (integration.apiKeyPrefix || integration.apiKeyLast4) ? {
    name: integration.apiKeyName || "fynovolive",
    prefix: integration.apiKeyPrefix,
    last4: integration.apiKeyLast4,
    permissions: integration.apiKeyPermissions || defaultPermissions,
    createdAt: integration.apiKeyCreatedAt,
    lastUsedAt: integration.apiKeyLastUsedAt || integration.lastSyncAt,
    expiresAt: integration.apiKeyExpiresAt,
    status: integration.apiKeyStatus || "active",
  } : null);

  const request = async (url: string, body?: unknown) => {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const data = await request("/api/integration", { baseUrl, apiKey, apiKeyName, syncIntervalMinutes: Number(interval) });
      setApiKey("");
      setShowKey(false);
      if (data.apiKeyLast4) setApiKeyLast4(data.apiKeyLast4);
      setKeyRecord((current) => apiKey ? { name: apiKeyName || "fynovolive", prefix: data.apiKeyPrefix || integration.apiKeyPrefix, last4: data.apiKeyLast4, permissions: integration.apiKeyPermissions || defaultPermissions, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), status: "active" } : current ? { ...current, name: apiKeyName || current.name } : current);
      try {
        const syncData = await request("/api/integration/sync");
        setMessage(`Connection saved and ${syncData.processed ?? 0} records synchronized.`);
      } catch (cause) {
        setError(`Connection saved, but synchronization failed: ${cause instanceof Error ? cause.message : "Unknown sync error."}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save settings.");
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setError(null);
    setMessage(null);
    try {
      await request("/api/integration/test", { baseUrl, apiKey });
      setKeyRecord((current) => current ? { ...current, lastUsedAt: new Date().toISOString() } : current);
      setMessage("Fynovo connection verified.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection test failed.");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const data = await request("/api/integration/sync");
      setKeyRecord((current) => current ? { ...current, lastUsedAt: new Date().toISOString() } : current);
      setMessage(data.message || `Synchronization complete — ${data.processed} records processed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally {
      setBusy(null);
    }
  };

  const savePreferences = async () => {
    setSavingPreferences(true);
    setError(null);
    setMessage(null);
    try {
      await request("/api/preferences", { currency, pendingTreatment, reportStartDay: 1 });
      setMessage("Reporting preferences saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save preferences.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const focusApiKey = () => {
    setShowKey(true);
    apiKeyInputRef.current?.focus();
  };

  return <div className="mx-auto max-w-5xl p-5 md:p-8">
    <section className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7">
      <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><KeyRound size={20} /></span><div><h2 className="text-lg font-semibold">Fynovo connection</h2><p className="mt-1 text-sm leading-5 text-muted">Keep the API connection for your Vaseegrah businesses in one secure place.</p></div></div>
      {process.env.NODE_ENV !== "production" && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Development mode is active. Dashboard data is labelled sample data until a production connection is configured.</div>}
      <form onSubmit={save} className="mt-6 space-y-4">
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Fynovo API base URL</span><input required type="url" placeholder="https://fynovo.in/api/v1/transactions" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">API key name</span><input required maxLength={80} placeholder="fynovolive" value={apiKeyName} onChange={(event) => setApiKeyName(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /><span className="mt-1 block text-xs text-muted">This name will appear in the Your API Keys table.</span></label>
        <div className="rounded-2xl border border-line bg-canvas p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm"><ShieldCheck size={17} /></span><div className="min-w-0"><p className="text-xs font-medium text-muted">Stored API key</p><p className="mt-1 truncate font-mono text-sm font-semibold">{apiKeyLast4 ? `•••• •••• •••• ${apiKeyLast4}` : "Not stored yet"}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${apiKeyLast4 ? "bg-brand-soft text-brand" : "bg-slate-200 text-muted"}`}>{apiKeyLast4 ? "Connected" : "Not set"}</span></div><p className="mt-3 text-xs leading-5 text-muted">The full key is encrypted on the server and is never returned to the browser. Add a new key below to replace it.</p></div>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">New API key</span><div className="relative"><input ref={apiKeyInputRef} required={!integration.configured} type={showKey ? "text" : "password"} placeholder={integration.configured ? "Leave blank to keep the stored key" : "Paste your Fynovo API key"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 pr-12 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /><button type="button" aria-label={showKey ? "Hide key" : "Show key"} onClick={() => setShowKey(!showKey)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-muted">{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        <label className="block max-w-xs"><span className="mb-1.5 block text-sm font-medium">Automatic sync interval</span><select value={interval} onChange={(event) => setInterval(event.target.value)} className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"><option value="60">Every hour</option><option value="360">Every 6 hours</option><option value="720">Every 12 hours</option><option value="1440">Daily</option></select></label>
        {message && <p className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand"><CheckCircle2 size={17} />{message}</p>}
        {error && <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"><CircleAlert size={17} />{error}</p>}
        <div className="flex flex-wrap gap-3 pt-2"><button disabled={busy !== null} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">{busy === "save" && <LoaderCircle className="animate-spin" size={16} />}Save securely</button><button type="button" disabled={busy !== null || !baseUrl || (!apiKey && !integration.configured)} onClick={test} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">{busy === "test" && <LoaderCircle className="animate-spin" size={16} />}Test connection</button><button type="button" disabled={busy !== null} onClick={sync} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">{busy === "sync" ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}Sync now</button></div>
      </form>
    </section>

    <section className="mt-5 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Your API Keys</h2><p className="mt-1 text-sm text-muted">Only the prefix is stored and displayed; the secret itself is not recoverable.</p></div><button type="button" aria-label="Refresh API key details" onClick={() => window.location.reload()} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted hover:bg-slate-50"><RefreshCw size={16} /></button></div><div className="mt-5 overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead><tr className="border-y border-line text-[10px] font-semibold uppercase tracking-wide text-muted"><th className="py-3 pr-4">Name</th><th className="py-3 pr-4">Key</th><th className="py-3 pr-4">Permissions</th><th className="py-3 pr-4">Created</th><th className="py-3 pr-4">Last used</th><th className="py-3 pr-4">Status</th><th className="py-3">Actions</th></tr></thead><tbody>{keyRecord ? <tr className="border-b border-line/80 align-top"><td className="py-4 pr-4 font-semibold text-ink">{keyRecord.name}</td><td className="py-4 pr-4 font-mono text-muted">{keyRecord.prefix || `fnv_••••${keyRecord.last4 || ""}`}</td><td className="max-w-44 py-4 pr-4 leading-5 text-muted">{keyRecord.permissions.map((permission) => <span key={permission} className="mr-1 inline-block">{permission}</span>)}</td><td className="whitespace-nowrap py-4 pr-4 text-muted">{formatDate(keyRecord.createdAt)}</td><td className="whitespace-nowrap py-4 pr-4 text-muted">{formatDateTime(keyRecord.lastUsedAt)}</td><td className="py-4 pr-4"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${keyRecord.status === "active" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-danger-soft text-danger"}`}>{keyRecord.status}</span>{keyRecord.expiresAt && <span className="mt-2 block text-[10px] text-muted">Expires {formatDate(keyRecord.expiresAt)}</span>}</td><td className="py-4"><button type="button" onClick={focusApiKey} className="font-semibold text-brand hover:underline">Replace</button></td></tr> : <tr><td colSpan={7} className="py-10 text-center text-sm text-muted">No API key has been saved yet.</td></tr>}</tbody></table></div></section>

    <section className="mt-5 rounded-3xl border border-line bg-white p-5 shadow-card"><h2 className="font-semibold">Reporting preferences</h2><p className="mt-1 text-sm leading-6 text-muted">Choose how amounts and unsettled records are handled in your reports.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium">Default currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)} className="h-11 w-full rounded-xl border border-line px-3 text-sm"><option value="INR">INR — Indian rupee</option><option value="USD">USD — US dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — Pound sterling</option></select></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Pending transactions</span><select value={pendingTreatment} onChange={(event) => setPendingTreatment(event.target.value as typeof pendingTreatment)} className="h-11 w-full rounded-xl border border-line px-3 text-sm"><option value="exclude">Exclude from totals</option><option value="include">Include in totals</option></select></label></div><button type="button" onClick={savePreferences} disabled={savingPreferences} className="mt-4 h-10 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">{savingPreferences ? "Saving…" : "Save preferences"}</button></section>

    <section className="mt-5 grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-line bg-white p-5 shadow-card"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-brand" /><h2 className="font-semibold">Connection status</h2></div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted">Fynovo setup</dt><dd className="font-medium">{integration.configured ? "Configured" : "Not connected"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Last synchronization</dt><dd className="text-right font-medium">{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString("en-IN") : "Not yet synced"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Sync status</dt><dd className={`font-semibold capitalize ${integration.lastSyncStatus === "failed" ? "text-danger" : "text-brand"}`}>{integration.lastSyncStatus || "never"}</dd></div></dl></article><article className="rounded-3xl border border-line bg-white p-5 shadow-card"><h2 className="font-semibold">Sync activity</h2>{integration.history.length ? <div className="mt-3 space-y-3">{integration.history.map((item) => <div key={item.id} className="rounded-xl bg-canvas px-3 py-2 text-sm"><div className="flex justify-between"><b className="capitalize">{item.status}</b><span className="text-xs text-muted">{new Date(item.startedAt).toLocaleString("en-IN")}</span></div>{item.error ? <p className="mt-1 text-xs text-danger">{item.error}</p> : <p className="mt-1 text-xs text-muted">{item.transactionsProcessed} records processed</p>}</div>)}</div> : <p className="mt-3 text-sm leading-6 text-muted">No synchronization history yet.</p>}</article></section>
    <p className="mt-5 text-xs leading-5 text-muted">Income and expense records are fetched separately from the configured Fynovo transactions endpoint and stored in their respective ledgers.</p>
  </div>;
}
