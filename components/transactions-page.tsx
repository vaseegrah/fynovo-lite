"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, CalendarDays, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { formatCurrency, isEligibleTransaction } from "@/lib/financial-calculations";
import type { FinancialTransaction, TransactionKind } from "@/types/financial";

const pageSize = 7;
export function TransactionsPage({ transactions, type }: { transactions: FinancialTransaction[]; type: TransactionKind }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<"newest" | "amount">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FinancialTransaction | null>(null);

  const categories = [...new Set(transactions.map((item) => item.category))].sort();
  const filtered = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            (item.description + item.category).toLowerCase().includes(search.toLowerCase()) &&
            (category === "all" || item.category === category) &&
            (!date || item.date === date),
        )
        .sort((a, b) => (sort === "amount" ? b.amount - a.amount : b.date.localeCompare(a.date))),
    [transactions, search, category, date, sort],
  );

  const total = filtered.reduce((sum, item) => sum + (isEligibleTransaction(item) ? item.amount : 0), 0);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const color = type === "income" ? "brand" : "danger";
  const label = type === "income" ? "income" : "expenses";

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-8">
      <section
        className={`rounded-3xl bg-${color} p-5 text-white shadow-card md:p-7`}
        style={{ background: type === "income" ? "#177C63" : "#BF4A47" }}
      >
        <p className="text-sm text-white/75">Total {label}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(total)}</h2>
            <p className="mt-1 text-sm text-white/75">{filtered.length} records</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold capitalize">{type} ledger</span>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative block flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={`Search ${label}`}
              className="h-11 w-full rounded-xl border border-line pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <label className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                aria-label="Filter by date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-line pl-9 pr-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
            >
              <option value="all">All categories</option>
              {categories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={() => setSort(sort === "newest" ? "amount" : "newest")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-muted hover:bg-slate-50"
            >
              <ArrowDownUp size={16} />
              <span className="hidden sm:inline">{sort === "newest" ? "Newest" : "Amount"}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[650px] w-full text-left">
            <thead>
              <tr className="border-y border-line text-xs font-medium uppercase tracking-wide text-muted">
                <th className="py-3 pl-1">Description</th>
                <th className="py-3">Category</th>
                <th className="py-3">Date</th>
                <th className="py-3">Method</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr onClick={() => setSelected(item)} key={item.id} className="cursor-pointer border-b border-line/80 text-sm hover:bg-slate-50">
                  <td className="py-4 pl-1">
                    <b className="block font-medium">{item.description || item.category}</b>
                    <small className="text-xs text-muted">{item.business || "Fynovo"}</small>
                  </td>
                  <td className="py-4 text-muted">{item.category}</td>
                  <td className="py-4 text-muted">
                    {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-4 text-muted">{item.paymentMethod}</td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.status === "paid"
                          ? "bg-brand-soft text-brand"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className={`py-4 text-right font-semibold ${type === "income" ? "text-brand" : "text-danger"}`}>
                    {type === "income" ? "+" : "−"}
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <div className="py-14 text-center text-sm text-muted">No {label} match these filters.</div>}
        </div>

        <div className="flex items-center justify-between pt-4 text-sm text-muted">
          <p>
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next page"
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {selected && <TransactionModal transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TransactionModal({ transaction, onClose }: { transaction: FinancialTransaction; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-ink/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Transaction detail</p>
            <h3 className="mt-1 text-xl font-semibold">{transaction.description || transaction.category}</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-muted">
            <X size={18} />
          </button>
        </div>
        <p className={`mt-5 text-3xl font-bold ${transaction.type === "income" ? "text-brand" : "text-danger"}`}>
          {transaction.type === "income" ? "+" : "−"}
          {formatCurrency(transaction.amount)}
        </p>
        <dl className="mt-6 divide-y divide-line rounded-2xl border border-line px-4">
          {[
            ["Brand", transaction.business || "—"],
            ["Date", transaction.date],
            ["Category", transaction.category],
            ["Payment method", transaction.paymentMethod],
            ["Status", transaction.status],
            ["Record ID", transaction.originalId],
          ].map(([label, value]) => (
            <div className="flex justify-between gap-4 py-3 text-sm" key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
