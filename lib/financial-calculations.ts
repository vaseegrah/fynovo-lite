import type { DateRange, FinancialSummary, FinancialTransaction } from "@/types/financial";

const excludedStatuses = new Set(["cancelled", "voided"]);

export function isEligibleTransaction(transaction: FinancialTransaction) {
  // Pending items are visible but excluded until paid. Refunds are imported by the
  // connector as reversing records so they are applied consistently once settled.
  return transaction.status === "paid" && !excludedStatuses.has(transaction.status);
}

export function inDateRange(date: string, range?: DateRange) {
  if (!range) return true;
  const value = new Date(`${date}T00:00:00`).getTime();
  return value >= new Date(`${range.from}T00:00:00`).getTime() && value <= new Date(`${range.to}T23:59:59`).getTime();
}

export function filterTransactions(transactions: FinancialTransaction[], range?: DateRange) {
  return transactions.filter((transaction) => isEligibleTransaction(transaction) && inDateRange(transaction.date, range));
}

export function calculateSummary(transactions: FinancialTransaction[], range?: DateRange): FinancialSummary {
  const eligible = filterTransactions(transactions, range);
  const totalIncome = eligible.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = eligible.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const difference = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netProfit: Math.max(difference, 0),
    netLoss: Math.max(-difference, 0),
    profitMargin: totalIncome > 0 ? Number(((Math.max(difference, 0) / totalIncome) * 100).toFixed(1)) : null,
    totalTransactions: eligible.length,
  };
}

export function formatCurrency(amountInPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amountInPaise / 100);
}

export function startOfMonthIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
