"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, Download, Landmark, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { calculateSummary, filterTransactions, formatCurrency } from "@/lib/financial-calculations";
import type { FinancialTransaction } from "@/types/financial";

type Preset = "month" | "week" | "year" | "today" | "custom";
const pieColors = ["#177C63", "#E8A649", "#D9534F", "#537BDB", "#9C67CF"];

function dateForPreset(preset: Exclude<Preset, "custom">) {
  const now = new Date(); const to = now.toISOString().slice(0, 10); const from = new Date(now);
  if (preset === "today") { /* same day */ }
  else if (preset === "week") from.setDate(now.getDate() - 6);
  else if (preset === "month") from.setDate(1);
  else { from.setMonth(0, 1); }
  return { preset, from: from.toISOString().slice(0, 10), to } as const;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-card"><p className="mb-1 font-semibold">{label}</p>{payload.map((entry) => <p key={entry.name} style={{ color: entry.color }}>{entry.name}: {formatCurrency(entry.value)}</p>)}</div>;
}

export function Dashboard({ incomeTransactions, expenseTransactions, userName }: { incomeTransactions: FinancialTransaction[]; expenseTransactions: FinancialTransaction[]; userName: string }) {
  const transactions = useMemo(() => [...incomeTransactions, ...expenseTransactions], [incomeTransactions, expenseTransactions]);
  const [preset, setPreset] = useState<Preset>("month");
  const initialRange = dateForPreset("month"); const [customFrom, setCustomFrom] = useState(initialRange.from); const [customTo, setCustomTo] = useState(initialRange.to);
  const range = preset === "custom" ? { preset, from: customFrom, to: customTo } : dateForPreset(preset);
  const filtered = useMemo(() => filterTransactions(transactions, range), [transactions, range.from, range.to]);
  const summary = useMemo(() => calculateSummary(transactions, range), [transactions, range.from, range.to]);
  const chartData = useMemo(() => {
    const groups = new Map<string, { label: string; income: number; expenses: number }>();
    filtered.forEach((item) => { const label = new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); const current = groups.get(item.date) || { label, income: 0, expenses: 0 }; current[item.type === "income" ? "income" : "expenses"] += item.amount; groups.set(item.date, current); });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [filtered]);
  const categoryData = useMemo(() => Object.values(filtered.filter((item) => item.type === "expense").reduce<Record<string, { name: string; value: number }>>((all, item) => { all[item.category] ??= { name: item.category, value: 0 }; all[item.category].value += item.amount; return all; }, {})).sort((a, b) => b.value - a.value), [filtered]);
  const cards = [
    { label: "Total income", value: summary.totalIncome, icon: ArrowDownRight, tone: "bg-brand-soft text-brand", detail: "Received this period" },
    { label: "Total expenses", value: summary.totalExpenses, icon: ArrowUpRight, tone: "bg-danger-soft text-danger", detail: "Paid this period" },
    { label: summary.netLoss > 0 ? "Net loss" : "Net profit", value: summary.netLoss || summary.netProfit, icon: summary.netLoss > 0 ? TrendingDown : TrendingUp, tone: summary.netLoss > 0 ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand", detail: summary.profitMargin !== null ? `${summary.profitMargin}% margin` : "No income yet" },
    { label: "Transactions", value: summary.totalTransactions, icon: ReceiptText, tone: "bg-slate-100 text-slate-600", detail: "Settled transactions" },
  ];
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return <div className="mx-auto max-w-7xl p-5 md:p-8"><section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted">Welcome back, {userName.split(" ")[0]} <span aria-hidden>👋</span></p><h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Your financial pulse</h2></div><div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1">{(["today", "week", "month", "year", "custom"] as Preset[]).map((item) => <button key={item} onClick={() => setPreset(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${preset === item ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-slate-50"}`}>{item === "week" ? "This week" : item === "month" ? "This month" : item === "year" ? "This year" : item === "custom" ? "Custom" : "Today"}</button>)}</div></section>{preset === "custom" && <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 text-sm"><span className="font-medium text-muted">Custom period</span><input aria-label="Custom period start" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 rounded-lg border border-line px-2" /><span className="text-muted">to</span><input aria-label="Custom period end" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 rounded-lg border border-line px-2" /></div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone, detail }) => <article key={label} className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-muted">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl ${tone}`}><Icon size={16} /></span></div><p className="mt-4 text-lg font-bold tracking-tight sm:text-2xl">{label === "Transactions" ? value.toLocaleString("en-IN") : formatCurrency(value)}</p><p className="mt-1 text-[11px] text-muted">{detail}</p></article>)}</section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.5fr,0.9fr]"><article className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5"><div className="mb-5 flex items-start justify-between"><div><h3 className="font-semibold">Cash flow</h3><p className="mt-1 text-xs text-muted">Income compared with expenses</p></div><Link href="/reports" className="text-xs font-semibold text-brand">Full report</Link></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={5}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#98A2B3" }} /><YAxis hide /><Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7F9FC" }} /><Bar dataKey="income" name="Income" fill="#177C63" radius={[5, 5, 0, 0]} maxBarSize={34} /><Bar dataKey="expenses" name="Expenses" fill="#E87872" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><div className="mt-2 flex justify-center gap-5 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-brand" />Income</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#E87872]" />Expenses</span></div></article>
      <article className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5"><div className="mb-1"><h3 className="font-semibold">Expense split</h3><p className="mt-1 text-xs text-muted">By category</p></div>{categoryData.length ? <><div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">{categoryData.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{categoryData.slice(0, 3).map((item, index) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted"><i className="h-2 w-2 rounded-full" style={{ background: pieColors[index] }} />{item.name}</span><b>{formatCurrency(item.value)}</b></div>)}</div></> : <EmptyChart />}</article></section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr,0.9fr]"><article className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Recent transactions</h3><p className="mt-1 text-xs text-muted">Latest activity from Fynovo</p></div><Link href="/income" className="inline-flex items-center text-xs font-semibold text-brand">View all <ChevronRight size={15} /></Link></div><div className="divide-y divide-line">{recent.map((item) => <Link href={item.type === "income" ? "/income" : "/expenses"} key={item.id} className="flex items-center gap-3 py-3 first:pt-0 hover:bg-slate-50"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${item.type === "income" ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger"}`}>{item.type === "income" ? <Landmark size={18} /> : <ReceiptText size={18} />}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.description}</b><small className="text-xs text-muted">{item.category} · {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></span><b className={`text-sm ${item.type === "income" ? "text-brand" : "text-danger"}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</b></Link>)}</div></article><article className="rounded-3xl bg-ink p-5 text-white shadow-card"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><CalendarDays size={19} /></span><h3 className="mt-7 text-lg font-semibold">Keep the numbers fresh</h3><p className="mt-2 text-sm leading-6 text-slate-300">Your dashboard excludes pending, cancelled and voided transactions. Sync Fynovo whenever you need an up-to-date view.</p><Link href="/settings" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#B8F2DD]">Manage connection <ChevronRight size={16} /></Link></article></section>
  </div>;
}

function EmptyChart() { return <div className="grid h-44 place-items-center text-center text-sm text-muted">No settled expenses<br />in this period.</div>; }

export function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  return <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#177C63" stopOpacity={0.3} /><stop offset="100%" stopColor="#177C63" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#98A2B3" }} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" name="Net result" stroke="#177C63" strokeWidth={2.5} fill="url(#profitGradient)" /></AreaChart></ResponsiveContainer></div>;
}
