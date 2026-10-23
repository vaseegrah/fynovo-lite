"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ShoppingBag, Sparkles, Store, TrendingDown, TrendingUp, Waves, type LucideIcon } from "lucide-react";
import { calculateSummary, formatCurrency, previousYearRange, reportingDate } from "@/lib/financial-calculations";
import type { BusinessName, FinancialTransaction } from "@/types/financial";

type Preset = "month" | "week" | "year" | "previous-year" | "today" | "custom";

const businesses: { name: BusinessName; caption: string; icon: LucideIcon; tone: string }[] = [
  { name: "Techvaseegrah", caption: "Technology", icon: Store, tone: "bg-[#EEF3FF] text-[#537BDB]" },
  { name: "Vaseegrah Veda", caption: "Wellness", icon: Sparkles, tone: "bg-[#FFF5E5] text-[#C98721]" },
  { name: "Vaseegrah Vanam", caption: "Nature & care", icon: Waves, tone: "bg-brand-soft text-brand" },
  { name: "Spa Vaseegrah", caption: "Spa & beauty", icon: ShoppingBag, tone: "bg-[#F6EEFF] text-[#9258C6]" },
];

function dateForPreset(preset: Exclude<Preset, "custom">) {
  if (preset === "previous-year") return previousYearRange();
  const to = reportingDate();
  const from = new Date(`${to}T00:00:00Z`);
  if (preset === "week") from.setUTCDate(from.getUTCDate() - 6);
  else if (preset === "month") from.setUTCDate(1);
  else if (preset === "year") from.setUTCMonth(0, 1);
  return { preset, from: from.toISOString().slice(0, 10), to } as const;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-card"><p className="mb-1 font-semibold">{label}</p>{payload.map((entry) => <p key={entry.name} style={{ color: entry.color }}>{entry.name}: {formatCurrency(entry.value)}</p>)}</div>;
}

export function Dashboard({ incomeTransactions, expenseTransactions, userName }: { incomeTransactions: FinancialTransaction[]; expenseTransactions: FinancialTransaction[]; userName: string }) {
  const router = useRouter();
  const transactions = useMemo(() => [...incomeTransactions, ...expenseTransactions], [incomeTransactions, expenseTransactions]);
  const [preset, setPreset] = useState<Preset>("month");
  const initialRange = dateForPreset("month");
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);

  const range = preset === "custom" ? { preset, from: customFrom, to: customTo } : dateForPreset(preset);
  const periodLabel = preset === "custom" ? "custom range" : preset === "previous-year" ? "previous year" : preset;

  const businessSummaries = useMemo(() => businesses.map((business) => {
    const scopedTransactions = transactions.filter((item) => (item.business || "Techvaseegrah") === business.name);
    const summary = calculateSummary(scopedTransactions, range);
    const periodRecordCount = scopedTransactions.filter((item) => item.date >= range.from && item.date <= range.to).length;
    const profitAndLoss = summary.netProfit - summary.netLoss;
    return {
      ...business,
      summary,
      periodRecordCount,
      profitAndLoss,
    };
  }), [transactions, range.from, range.to]);

  useEffect(() => {
    let active = true;
    let syncing = false;

    const syncLatest = async () => {
      if (syncing || document.visibilityState !== "visible") return;
      syncing = true;
      try {
        const response = await fetch("/api/integration/sync", { method: "POST" });
        const result = await response.json().catch(() => ({})) as {
          error?: string;
          processed?: number;
          failed?: number;
        };
        if (!response.ok) throw new Error(result.error || "Could not fetch the latest Fynovo records.");
        if (active && result.processed) router.refresh();
      } catch (error) {
        if (active) console.error("Automatic Fynovo sync failed.", error);
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
  }, [router]);

  return <div className="mx-auto max-w-7xl p-3 sm:p-5 md:p-8">
    <section className="mb-3 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-end sm:gap-4">
      <div><p className="text-xs text-muted sm:text-sm">Welcome back, {userName.split(" ")[0]} <span aria-hidden>👋</span></p><h2 className="mt-0.5 text-lg font-semibold tracking-tight sm:mt-1 sm:text-2xl md:text-3xl">Brand overview</h2></div>
      <div className="scrollbar-none flex gap-0.5 overflow-x-auto rounded-lg border border-line bg-white p-0.5 sm:gap-1 sm:rounded-xl sm:p-1">{(["today", "week", "month", "year", "previous-year", "custom"] as Preset[]).map((item) => <button key={item} onClick={() => setPreset(item)} className={`whitespace-nowrap rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs ${preset === item ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-slate-50"}`}>{item === "week" ? "This week" : item === "month" ? "This month" : item === "year" ? "This year" : item === "previous-year" ? "Previous year" : item === "custom" ? "Custom" : "Today"}</button>)}</div>
    </section>
    {preset === "custom" && <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white p-2 text-xs sm:mb-5 sm:gap-2 sm:rounded-2xl sm:p-3 sm:text-sm"><span className="font-medium text-muted">Custom period</span><input aria-label="Custom period start" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-8 rounded-md border border-line px-1.5 sm:h-9 sm:rounded-lg sm:px-2" /><span className="text-muted">to</span><input aria-label="Custom period end" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-8 rounded-md border border-line px-1.5 sm:h-9 sm:rounded-lg sm:px-2" /></div>}

    <section aria-label="Brand totals" className="grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
      {businessSummaries.map(({ name, caption, icon: Icon, tone, summary, periodRecordCount, profitAndLoss }) => <article key={name} className="min-w-0 rounded-2xl border border-line p-3 shadow-card sm:rounded-3xl sm:p-5">
        <div className="flex min-w-0 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${tone}`}><Icon size={17} /></span><span className="min-w-0"><b className="block truncate text-sm">{name}</b><small className="block truncate text-[11px] text-muted sm:text-xs">{caption}</small></span></div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
          <BusinessMetric label="Income" value={summary.totalIncome} icon={ArrowDownRight} tone="bg-brand-soft text-brand" borderTone="border-brand/20" />
          <BusinessMetric label="Expenses" value={summary.totalExpenses} icon={ArrowUpRight} tone="bg-danger-soft text-danger" borderTone="border-danger/20" />
          <BusinessMetric label={profitAndLoss < 0 ? "Net loss" : "Net profit"} value={profitAndLoss} icon={profitAndLoss < 0 ? TrendingDown : TrendingUp} tone={profitAndLoss < 0 ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"} borderTone={profitAndLoss < 0 ? "border-danger/20" : "border-brand/20"} />
        </div>
        <p className="mt-2 text-[10px] leading-4 text-muted sm:mt-3 sm:text-[11px]">
          {periodRecordCount} records in {periodLabel} · Income {formatCurrency(summary.totalIncome)} · Expenses {formatCurrency(summary.totalExpenses)}
        </p>
      </article>)}
    </section>
  </div>;
}

function BusinessMetric({ label, value, icon: Icon, tone, borderTone }: { label: string; value: number; icon: LucideIcon; tone: string; borderTone: string }) {
  return <div className={`min-w-0 rounded-xl border ${borderTone} bg-canvas p-2 sm:rounded-2xl sm:p-3`}><div className="flex min-w-0 items-center justify-between gap-1"><span className="truncate text-[10px] font-medium text-muted sm:text-[11px]">{label}</span><span className={`hidden h-6 w-6 shrink-0 place-items-center rounded-lg sm:grid sm:h-7 sm:w-7 ${tone}`}><Icon size={12} /></span></div><p className="mt-1 truncate text-xs font-bold tracking-tight sm:mt-2 sm:text-lg">{formatCurrency(value)}</p></div>;
}

export function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  return <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#177C63" stopOpacity={0.3} /><stop offset="100%" stopColor="#177C63" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#98A2B3" }} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" name="Net result" stroke="#177C63" strokeWidth={2.5} fill="url(#profitGradient)" /></AreaChart></ResponsiveContainer></div>;
}
