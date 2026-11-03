"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ShoppingBag, Sparkles, Store, TrendingDown, TrendingUp, Waves, type LucideIcon } from "lucide-react";
import { customYearRange, dateRangeForPreset, formatCurrency, reportingDate } from "@/lib/financial-calculations";
import type { BusinessFinancialSummary, BusinessName, DatePreset, FinancialSummary } from "@/types/financial";

type Preset = DatePreset;

const businesses: { name: BusinessName; caption: string; icon: LucideIcon; tone: string }[] = [
  { name: "Techvaseegrah", caption: "Technology", icon: Store, tone: "bg-[#EEF3FF] text-[#537BDB]" },
  { name: "Vaseegrah Veda", caption: "Wellness", icon: Sparkles, tone: "bg-[#FFF5E5] text-[#C98721]" },
  { name: "Vaseegrah Vanam", caption: "Nature & care", icon: Waves, tone: "bg-brand-soft text-brand" },
  { name: "Spa Vaseegrah", caption: "Spa & beauty", icon: ShoppingBag, tone: "bg-[#F6EEFF] text-[#9258C6]" },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-card"><p className="mb-1 font-semibold">{label}</p>{payload.map((entry) => <p key={entry.name} style={{ color: entry.color }}>{entry.name}: {formatCurrency(entry.value)}</p>)}</div>;
}

export function Dashboard({ initialSummaries, initialUnassignedRecords, userName }: { initialSummaries: BusinessFinancialSummary[]; initialUnassignedRecords: number; userName: string }) {
  const [preset, setPreset] = useState<Preset>("month");
  const initialRange = dateRangeForPreset("month");
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [customYear, setCustomYear] = useState(Number(reportingDate().slice(0, 4)));
  const [businessSummaries, setBusinessSummaries] = useState(initialSummaries);
  const [unassignedRecords, setUnassignedRecords] = useState(initialUnassignedRecords);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  // Counter bumped after each successful background sync so summaries refresh automatically
  const [syncTick, setSyncTick] = useState(0);

  const range = preset === "custom"
    ? { preset, from: customFrom, to: customTo }
    : preset === "custom-year"
      ? customYearRange(customYear)
      : preset === "all-time"
        ? dateRangeForPreset(preset)
        : dateRangeForPreset(preset);
  const periodLabel = preset === "custom" ? "custom range" : preset === "custom-year" ? String(customYear) : preset === "all-time" ? "all time" : preset;
  const currentYear = Number(reportingDate().slice(0, 4));
  const yearOptions = Array.from({ length: Math.max(0, currentYear - 1970 + 1) }, (_, index) => currentYear - index);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadSummaries = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const query = new URLSearchParams({ summaryOnly: "true" });
        if (range) {
          query.set("from", range.from);
          query.set("to", range.to);
        }
        const response = await fetch(`/api/dashboard?${query}`, { signal: controller.signal });
        const result = await response.json() as { error?: string; summaries?: BusinessFinancialSummary[]; unassignedRecords?: number };
        if (!response.ok) throw new Error(result.error || "Could not load business totals.");
        if (!Array.isArray(result.summaries)) throw new Error("The dashboard returned an invalid summary.");
        if (!Number.isInteger(result.unassignedRecords) || (result.unassignedRecords ?? -1) < 0) {
          throw new Error("The dashboard returned an invalid business assignment count.");
        }
        if (active) {
          setBusinessSummaries(result.summaries);
          setUnassignedRecords(result.unassignedRecords ?? 0);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setSummaryError(error instanceof Error ? error.message : "Could not load business totals.");
        }
      } finally {
        if (active) setSummaryLoading(false);
      }
    };
    void loadSummaries();
    return () => {
      active = false;
      controller.abort();
    };
  // Re-fetch when date range changes OR when the page is refreshed with new initial data.
  // Note: initialSummaries / initialUnassignedRecords are excluded from deps intentionally —
  // they represent the server-rendered "month" snapshot; preset changes drive client fetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to, preset, syncTick]);

  useEffect(() => {
    let active = true;
    let syncing = false;

    const syncLatest = async () => {
      if (syncing || document.visibilityState !== "visible") return;
      syncing = true;
      try {
        const response = await fetch("/api/integration/sync?automatic=true", { method: "POST" });
        const result = await response.json().catch(() => ({})) as {
          error?: string;
          processed?: number;
          failed?: number;
        };
        if (!response.ok) {
          if (result.error?.includes("Configure at least one brand") || result.error?.includes("Connect Fynovo")) {
            return;
          }
          throw new Error(result.error || "Could not fetch the latest Fynovo records.");
        }
        // If new records were synced, bump syncTick to trigger a summary re-fetch
        // without a full page navigation.
        if (active && result.processed) setSyncTick((t) => t + 1);
      } catch (error) {
        if (active) console.warn("Automatic Fynovo sync failed.", error);
      } finally {
        syncing = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncLatest();
    };

    const initialSync = window.setTimeout(() => void syncLatest(), 0);
    const interval = window.setInterval(() => void syncLatest(), 5 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(initialSync);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="mx-auto max-w-7xl p-3 sm:p-5 md:p-8">
    <section className="mb-3 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-end sm:gap-4">
      <div><p className="text-xs text-muted sm:text-sm">Welcome back, {userName.split(" ")[0]} <span aria-hidden>👋</span></p><h2 className="mt-0.5 text-lg font-semibold tracking-tight sm:mt-1 sm:text-2xl md:text-3xl">Brand overview</h2></div>
      <div className="scrollbar-none flex gap-0.5 overflow-x-auto rounded-lg border border-line bg-white p-0.5 sm:gap-1 sm:rounded-xl sm:p-1">{(["today", "week", "month", "year", "all-time", "custom-year", "custom"] as Preset[]).map((item) => <button key={item} onClick={() => setPreset(item)} className={`whitespace-nowrap rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs ${preset === item ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-slate-50"}`}>{item === "week" ? "This week" : item === "month" ? "This month" : item === "year" ? "This year" : item === "all-time" ? "All Time" : item === "custom-year" ? "Custom year" : item === "custom" ? "Custom dates" : "Today"}</button>)}</div>
    </section>
    {preset === "custom-year" && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 text-xs sm:mb-5 sm:rounded-2xl sm:p-3 sm:text-sm"><label htmlFor="custom-year" className="font-medium text-muted">Select year</label><select id="custom-year" aria-label="Custom year" value={customYear} onChange={(event) => setCustomYear(Number(event.target.value))} className="h-8 rounded-md border border-line px-2 sm:h-9 sm:rounded-lg">{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>}
    {preset === "custom" && <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white p-2 text-xs sm:mb-5 sm:gap-2 sm:rounded-2xl sm:p-3 sm:text-sm"><span className="font-medium text-muted">Custom period</span><input aria-label="Custom period start" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-8 rounded-md border border-line px-1.5 sm:h-9 sm:rounded-lg sm:px-2" /><span className="text-muted">to</span><input aria-label="Custom period end" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-8 rounded-md border border-line px-1.5 sm:h-9 sm:rounded-lg sm:px-2" /></div>}

    {summaryError && <p role="alert" className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">{summaryError}</p>}
    {unassignedRecords > 0 && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{unassignedRecords} records in this period are missing a recognized business tag and are excluded from business totals.</p>}
    {summaryLoading && <p aria-live="polite" className="mt-3 text-xs text-muted">Updating business totals...</p>}
    <section aria-label="Brand totals" className="grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
      {businesses.map(({ name, caption, icon: Icon, tone }) => {
        const summary = businessSummaries.find((item) => item.business === name) ?? emptySummary;
        const profitAndLoss = summary.netProfit - summary.netLoss;
        return <article key={name} className="min-w-0 rounded-2xl border border-line p-3 shadow-card sm:rounded-3xl sm:p-5">
        <div className="flex min-w-0 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${tone}`}><Icon size={17} /></span><span className="min-w-0"><b className="block truncate text-sm">{name}</b><small className="block truncate text-[11px] text-muted sm:text-xs">{caption}</small></span></div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
          <BusinessMetric label="Income" value={summary.totalIncome} icon={ArrowDownRight} tone="bg-brand-soft text-brand" borderTone="border-brand/20" />
          <BusinessMetric label="Expenses" value={summary.totalExpenses} icon={ArrowUpRight} tone="bg-danger-soft text-danger" borderTone="border-danger/20" />
          <BusinessMetric label={profitAndLoss < 0 ? "Net loss" : "Net profit"} value={profitAndLoss} icon={profitAndLoss < 0 ? TrendingDown : TrendingUp} tone={profitAndLoss < 0 ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"} borderTone={profitAndLoss < 0 ? "border-danger/20" : "border-brand/20"} />
        </div>
        <p className="mt-2 text-[10px] leading-4 text-muted sm:mt-3 sm:text-[11px]">
          {summary.totalTransactions} records in {periodLabel} · Income {formatCurrency(summary.totalIncome)} · Expenses {formatCurrency(summary.totalExpenses)}
        </p>
      </article>;
      })}
    </section>
  </div>;
}

const emptySummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  netLoss: 0,
  profitMargin: null,
  totalTransactions: 0,
};

function BusinessMetric({ label, value, icon: Icon, tone, borderTone }: { label: string; value: number; icon: LucideIcon; tone: string; borderTone: string }) {
  return <div className={`min-w-0 rounded-xl border ${borderTone} bg-canvas p-2 sm:rounded-2xl sm:p-3`}><div className="flex min-w-0 items-center justify-between gap-1"><span className="truncate text-[10px] font-medium text-muted sm:text-[11px]">{label}</span><span className={`hidden h-6 w-6 shrink-0 place-items-center rounded-lg sm:grid sm:h-7 sm:w-7 ${tone}`}><Icon size={12} /></span></div><p className="mt-1 truncate text-xs font-bold tracking-tight sm:mt-2 sm:text-lg">{formatCurrency(value)}</p></div>;
}

export function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  return <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#177C63" stopOpacity={0.3} /><stop offset="100%" stopColor="#177C63" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#98A2B3" }} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" name="Net result" stroke="#177C63" strokeWidth={2.5} fill="url(#profitGradient)" /></AreaChart></ResponsiveContainer></div>;
}
