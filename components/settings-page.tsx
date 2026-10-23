"use client";

import { type FormEvent, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { IntegrationPublicData, BrandIntegration, BusinessName } from "@/types/financial";
import type { PreferencesData } from "@/services/preferences-service";

type SettingsData = IntegrationPublicData & {
  history: { id: string; status: string; startedAt: string; error?: string; transactionsProcessed: number }[];
  brands: BrandIntegration[];
};

const BRAND_ICONS: Record<BusinessName, string> = {
  "Techvaseegrah": "🏢",
  "Vaseegrah Veda": "✨",
  "Vaseegrah Vanam": "🌿",
  "Spa Vaseegrah": "💆",
};

const BRAND_COLORS: Record<BusinessName, string> = {
  "Techvaseegrah": "bg-blue-50 text-blue-600",
  "Vaseegrah Veda": "bg-amber-50 text-amber-600",
  "Vaseegrah Vanam": "bg-green-50 text-green-600",
  "Spa Vaseegrah": "bg-purple-50 text-purple-600",
};

function formatDateTime(value?: string) {
  if (!value) return "Not synced";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function BrandApiCard({ data, onUpdated }: { data: BrandIntegration; onUpdated: (updated: BrandIntegration) => void }) {
  const [incomeBaseUrl, setIncomeBaseUrl] = useState(data.incomeBaseUrl || data.baseUrl || "");
  const [expenseBaseUrl, setExpenseBaseUrl] = useState(data.expenseBaseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState(data.apiKeyName || data.brand);
  const [interval, setInterval] = useState(String(data.syncIntervalMinutes || 1440));
  const [showKey, setShowKey] = useState(false);
  const [apiKeyLast4, setApiKeyLast4] = useState(data.apiKeyLast4 || null);
  const [lastSyncAt, setLastSyncAt] = useState(data.lastSyncAt);
  const [lastSyncStatus, setLastSyncStatus] = useState(data.lastSyncStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "sync" | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  const encodedBrand = encodeURIComponent(data.brand);

  const request = async (url: string, body?: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Something went wrong.");
    return json;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("save"); setError(null); setMessage(null);
    try {
      const result = await request(`/api/integration/brand/${encodedBrand}`, {
        incomeBaseUrl,
        expenseBaseUrl,
        baseUrl: incomeBaseUrl || expenseBaseUrl,
        apiKey,
        apiKeyName,
        syncIntervalMinutes: Number(interval),
      });
      setApiKey(""); setShowKey(false);
      if (result.apiKeyLast4) setApiKeyLast4(result.apiKeyLast4);
      onUpdated({
        ...data,
        incomeBaseUrl,
        expenseBaseUrl,
        baseUrl: incomeBaseUrl || expenseBaseUrl,
        apiKeyName,
        apiKeyLast4: result.apiKeyLast4 || apiKeyLast4 || undefined,
        configured: true,
      });
      try {
        const syncResult = await request(`/api/integration/brand/${encodedBrand}/sync`);
        setLastSyncAt(new Date().toISOString()); setLastSyncStatus("success");
        setMessage(syncSummary(syncResult, data.brand));
      } catch (cause) {
        setError(`Saved, but sync failed: ${cause instanceof Error ? cause.message : "Unknown error."}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save settings.");
    } finally { setBusy(null); }
  };

  const test = async () => {
    setBusy("test"); setError(null); setMessage(null);
    try {
      await request(`/api/integration/brand/${encodedBrand}/test`, {
        incomeBaseUrl,
        expenseBaseUrl,
        baseUrl: incomeBaseUrl || expenseBaseUrl,
        apiKey,
      });
      setMessage(`${data.brand} connection verified successfully.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection test failed.");
    } finally { setBusy(null); }
  };

  const sync = async () => {
    setBusy("sync"); setError(null); setMessage(null);
    try {
      const result = await request(`/api/integration/brand/${encodedBrand}/sync`);
      setLastSyncAt(new Date().toISOString()); setLastSyncStatus("success");
      setMessage(syncSummary(result, data.brand));
    } catch (cause) {
      setLastSyncStatus("failed");
      setError(cause instanceof Error ? cause.message : "Sync failed.");
    } finally { setBusy(null); }
  };

  const isConfigured = data.configured || !!apiKeyLast4;

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-5">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${BRAND_COLORS[data.brand]}`}>
          {BRAND_ICONS[data.brand]}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-ink truncate">{data.brand}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${isConfigured ? "bg-brand-soft text-brand" : "bg-slate-100 text-muted"}`}>
              {isConfigured ? "Connected" : "Not connected"}
            </span>
            {lastSyncStatus && lastSyncStatus !== "never" && (
              <span className={`text-xs ${lastSyncStatus === "success" ? "text-brand" : "text-danger"}`}>
                · Last sync {formatDateTime(lastSyncAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* Stored key badge */}
        <div className="rounded-2xl border border-line bg-canvas p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className={isConfigured ? "text-brand" : "text-muted"} />
              <span className="text-xs font-medium text-muted">Stored key</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {apiKeyLast4 ? `•••• •••• •••• ${apiKeyLast4}` : "Not set"}
            </span>
          </div>
        </div>

        {/* Two Base URL boxes: Income & Expense */}
        <div className="space-y-3">
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-medium text-ink">Income API Base URL</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-soft text-brand">Income</span>
            </div>
            <input
              type="url"
              placeholder="https://fynovo.in/api/v1/income or /transactions"
              value={incomeBaseUrl}
              onChange={(e) => setIncomeBaseUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-slate-400"
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-medium text-ink">Expense API Base URL</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">Expense</span>
            </div>
            <input
              type="url"
              placeholder="https://fynovo.in/api/v1/expenses"
              value={expenseBaseUrl}
              onChange={(e) => setExpenseBaseUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-slate-400"
            />
          </label>
        </div>

        {/* API key name */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Key name</span>
          <input
            required
            maxLength={80}
            placeholder={data.brand}
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
            className="h-10 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </label>

        {/* New API key */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">New API key</span>
          <div className="relative">
            <input
              ref={apiKeyInputRef}
              required={!isConfigured}
              type={showKey ? "text" : "password"}
              placeholder={isConfigured ? "Leave blank to keep existing key" : "Paste API key here"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-10 w-full rounded-xl border border-line px-3 pr-10 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
            <button
              type="button"
              aria-label={showKey ? "Hide key" : "Show key"}
              onClick={() => setShowKey(!showKey)}
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center text-muted"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {/* Sync interval */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Sync interval</span>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="h-10 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
          >
            <option value="60">Every hour</option>
            <option value="360">Every 6 hours</option>
            <option value="720">Every 12 hours</option>
            <option value="1440">Daily</option>
          </select>
        </label>

        {/* Feedback */}
        {message && <p className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand"><CheckCircle2 size={14} />{message}</p>}
        {error && <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger"><CircleAlert size={14} />{error}</p>}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === "save" && <LoaderCircle className="animate-spin" size={14} />}Save securely
          </button>
          <button
            type="button"
            disabled={busy !== null || (!incomeBaseUrl && !expenseBaseUrl) || (!apiKey && !isConfigured)}
            onClick={test}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold disabled:opacity-60"
          >
            {busy === "test" && <LoaderCircle className="animate-spin" size={14} />}Test
          </button>
          <button
            type="button"
            disabled={busy !== null || !isConfigured}
            onClick={sync}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold disabled:opacity-60"
          >
            {busy === "sync" ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />}Sync now
          </button>
        </div>
      </form>
    </div>
  );
}

function syncSummary(result: { processed?: number; fetchedByKind?: { income?: number; expense?: number }; skippedMissingId?: number; statusCounts?: Record<string, number> }, brand: string) {
  const fetched = (result.fetchedByKind?.income || 0) + (result.fetchedByKind?.expense || 0);
  const skipped = result.skippedMissingId || 0;
  if (!fetched) return `The ${brand} API returned no transactions. Check the API URLs and key permissions.`;
  const statuses = Object.entries(result.statusCounts || {}).map(([status, count]) => `${status}: ${count}`).join(", ");
  const statusSummary = statuses ? ` Statuses — ${statuses}.` : "";
  if (skipped) return `Fetched ${fetched}; saved ${result.processed || 0}; skipped ${skipped} without transaction IDs for ${brand}.${statusSummary}`;
  return `Fetched and saved ${result.processed || 0} transactions for ${brand}.${statusSummary}`;
}

export function SettingsPage({ integration, preferences }: { integration: SettingsData; preferences: PreferencesData }) {
  const [brands, setBrands] = useState<BrandIntegration[]>(integration.brands);
  const [currency, setCurrency] = useState(preferences.currency);
  const [pendingTreatment, setPendingTreatment] = useState(preferences.pendingTreatment);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefMessage, setPrefMessage] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  const updateBrand = (updated: BrandIntegration) =>
    setBrands((prev) => prev.map((b) => b.brand === updated.brand ? updated : b));

  const savePreferences = async () => {
    setSavingPreferences(true); setPrefError(null); setPrefMessage(null);
    try {
      const res = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, pendingTreatment, reportStartDay: 1 }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed.");
      setPrefMessage("Reporting preferences saved.");
    } catch (cause) {
      setPrefError(cause instanceof Error ? cause.message : "Could not save preferences.");
    } finally { setSavingPreferences(false); }
  };

  return (
    <div className="mx-auto max-w-5xl p-5 md:p-8">

      {/* Brand API Keys section */}
      <section>
        <div className="flex gap-3 mb-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Fynovo connection — by brand</h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Configure independent Income & Expense API base URLs and API keys for each brand. Data is fetched and categorized separately per brand.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {brands.map((brand) => (
            <BrandApiCard key={brand.brand} data={brand} onUpdated={updateBrand} />
          ))}
        </div>
      </section>

      {/* Connection status per brand */}
      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-brand" />
            <h2 className="font-semibold">Connection status</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {brands.map((b) => (
              <div key={b.brand} className="flex justify-between gap-3">
                <dt className="text-muted">{b.brand}</dt>
                <dd className={`font-semibold text-xs ${b.configured ? "text-brand" : "text-muted"}`}>
                  {b.configured ? `Connected · ${b.lastSyncStatus || "never"}` : "Not connected"}
                </dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="rounded-3xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-semibold">Last sync per brand</h2>
          <div className="mt-4 space-y-3">
            {brands.map((b) => (
              <div key={b.brand} className="rounded-xl bg-canvas px-3 py-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs">{b.brand}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.lastSyncStatus === "success" ? "bg-[#DCFCE7] text-[#15803D]" : b.lastSyncStatus === "failed" ? "bg-danger-soft text-danger" : "bg-slate-100 text-muted"}`}>
                    {b.lastSyncStatus || "never"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{formatDateTime(b.lastSyncAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Sync history */}
      {integration.history.length > 0 && (
        <section className="mt-5 rounded-3xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Sync activity</h2>
              <p className="mt-1 text-sm text-muted">Recent synchronization history.</p>
            </div>
            <button type="button" aria-label="Refresh" onClick={() => window.location.reload()} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted hover:bg-slate-50">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {integration.history.map((item) => (
              <div key={item.id} className="rounded-xl bg-canvas px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <b className="capitalize">{item.status}</b>
                  <span className="text-xs text-muted">{new Date(item.startedAt).toLocaleString("en-IN")}</span>
                </div>
                {item.error ? <p className="mt-1 text-xs text-danger">{item.error}</p> : <p className="mt-1 text-xs text-muted">{item.transactionsProcessed} records processed</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reporting preferences */}
      <section className="mt-5 rounded-3xl border border-line bg-white p-5 shadow-card">
        <h2 className="font-semibold">Reporting preferences</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Choose how amounts and unsettled records are handled in your reports.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Default currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className="h-11 w-full rounded-xl border border-line px-3 text-sm">
              <option value="INR">INR — Indian rupee</option>
              <option value="USD">USD — US dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — Pound sterling</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Pending transactions</span>
            <select value={pendingTreatment} onChange={(e) => setPendingTreatment(e.target.value as typeof pendingTreatment)} className="h-11 w-full rounded-xl border border-line px-3 text-sm">
              <option value="exclude">Exclude from totals</option>
              <option value="include">Include in totals</option>
            </select>
          </label>
        </div>
        {prefMessage && <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand"><CheckCircle2 size={16} />{prefMessage}</p>}
        {prefError && <p className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"><CircleAlert size={16} />{prefError}</p>}
        <button type="button" onClick={savePreferences} disabled={savingPreferences} className="mt-4 h-10 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60">
          {savingPreferences ? "Saving…" : "Save preferences"}
        </button>
      </section>

      <p className="mt-5 text-xs leading-5 text-muted">
        Income and expense records are fetched separately from their configured endpoint URLs and stored in their respective brand ledgers.
      </p>
    </div>
  );
}
