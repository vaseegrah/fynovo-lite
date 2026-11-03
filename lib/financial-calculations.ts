import type { DateRange, FinancialSummary, FinancialTransaction } from "@/types/financial";

const excludedStatuses = new Set(["cancelled", "voided", "refunded"]);

export function reportingDate(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function customYearRange(year: number): DateRange {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("Year must be an integer between 1 and 9999.");
  }
  const yearText = String(year).padStart(4, "0");
  return {
    from: `${yearText}-01-01`,
    to: `${yearText}-12-31`,
    preset: "custom-year",
  };
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function dateRangeToUtcBounds(range: Pick<DateRange, "from" | "to">) {
  const from = parseDateOnly(range.from);
  const to = parseDateOnly(range.to);
  if (!from || !to || from > to) throw new RangeError("Enter a valid date range.");

  const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    from: new Date(from.getTime() - indiaOffsetMs),
    toExclusive: new Date(to.getTime() + dayMs - indiaOffsetMs),
  };
}

type BoundedDatePreset = Exclude<DateRange["preset"], "custom" | "custom-year" | "all-time">;

export function dateRangeForPreset(preset: "all-time", date?: Date): undefined;
export function dateRangeForPreset(preset: BoundedDatePreset, date?: Date): DateRange;
export function dateRangeForPreset(
  preset: BoundedDatePreset | "all-time",
  date: Date = new Date(),
): DateRange | undefined {
  if (preset === "all-time") return undefined;
  const to = reportingDate(date);
  const from = parseDateOnly(to);
  if (!from) throw new RangeError("Could not determine the reporting date.");
  if (preset === "week") from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
  else if (preset === "month") from.setUTCDate(1);
  else if (preset === "year") from.setUTCMonth(0, 1);
  return { preset, from: from.toISOString().slice(0, 10), to };
}

export function isEligibleTransaction(transaction: FinancialTransaction) {
  return !excludedStatuses.has(transaction.status);
}

export function inDateRange(date: string, range?: DateRange) {
  if (!range) return true;
  return date >= range.from && date <= range.to;
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
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amountInPaise / 100);
}

export function startOfMonthIso() {
  return `${reportingDate().slice(0, 7)}-01`;
}

export function todayIso() {
  return reportingDate();
}
