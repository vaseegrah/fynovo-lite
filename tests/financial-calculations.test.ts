import { describe, expect, it } from "vitest";
import { calculateSummary, customYearRange, dateRangeForPreset, dateRangeToUtcBounds, filterTransactions, formatCurrency, reportingDate } from "../lib/financial-calculations";
import { businessForTransaction, businessNames, displayBusinessName, normaliseBusinessName } from "../lib/businesses";
import { transactionStatus } from "../lib/transaction-status";
import { amountInMinorUnits } from "../lib/transaction-amount";
import { isSyncDue } from "../lib/sync-schedule";
import { parseTransactionDate } from "../lib/transaction-date";
import { defaultContractFor } from "../lib/fynovo-contract";
import { fynovoTransactionFields } from "../lib/fynovo-transaction-fields";
import type { FinancialTransaction } from "../types/financial";

const transaction = (overrides: Partial<FinancialTransaction>): FinancialTransaction => ({ id: "id", originalId: "source-id", type: "income", date: "2026-10-01", description: "Test", category: "Services", amount: 10000, currency: "INR", paymentMethod: "Bank", status: "paid", source: "fynovo", ...overrides });

describe("financial calculations", () => {
  it("calculates profit using integer minor units", () => {
    const summary = calculateSummary([transaction({ amount: 10000000 }), transaction({ id: "e", originalId: "e", type: "expense", amount: 6500000 })]);
    expect(summary).toMatchObject({ totalIncome: 10000000, totalExpenses: 6500000, netProfit: 3500000, netLoss: 0, profitMargin: 35, totalTransactions: 2 });
  });
  it("reports loss without a negative profit", () => {
    const summary = calculateSummary([transaction({ amount: 5000000 }), transaction({ id: "e", originalId: "e", type: "expense", amount: 7000000 })]);
    expect(summary.netProfit).toBe(0); expect(summary.netLoss).toBe(2000000);
  });
  it("includes non-paid transactions in totals but excludes cancelled, voided and refunded records", () => {
    const records = [
      transaction({ status: "pending", amount: 10000 }),
      transaction({ id: "2", originalId: "2", status: "packed", amount: 20000 }),
      transaction({ id: "3", originalId: "3", status: "cancelled", amount: 30000 }),
      transaction({ id: "4", originalId: "4", status: "voided", amount: 40000 }),
      transaction({ id: "5", originalId: "5", status: "refunded", amount: 50000 }),
      transaction({ id: "6", originalId: "6", status: "paid", amount: 60000 }),
    ];
    expect(filterTransactions(records)).toHaveLength(3);
    expect(calculateSummary(records).totalIncome).toBe(90000);
  });
  it("calculates income and expenses for only the selected day", () => {
    const records = [
      transaction({ date: "2026-10-23", amount: 12500 }),
      transaction({ id: "expense-today", originalId: "expense-today", date: "2026-10-23", type: "expense", amount: 3200 }),
      transaction({ id: "income-yesterday", originalId: "income-yesterday", date: "2026-10-22", amount: 50000 }),
    ];
    expect(calculateSummary(records, { preset: "today", from: "2026-10-23", to: "2026-10-23" }))
      .toMatchObject({ totalIncome: 12500, totalExpenses: 3200, netProfit: 9300, totalTransactions: 2 });
  });
  it("uses the India calendar date for UTC transaction timestamps", () => {
    expect(reportingDate(new Date("2026-10-22T20:00:00.000Z"))).toBe("2026-10-23");
  });
  it("leaves the all-time preset unbounded so every stored transaction is included", () => {
    expect(dateRangeForPreset("all-time", new Date("2026-10-22T20:00:00.000Z"))).toBeUndefined();
    expect(calculateSummary([
      transaction({ date: "2024-12-31", amount: 10000 }),
      transaction({ date: "2025-01-01", amount: 20000 }),
      transaction({ date: "2026-01-01", amount: 40000 }),
    ])).toMatchObject({ totalIncome: 70000, totalTransactions: 3 });
  });
  it("uses India calendar dates for current month and year presets", () => {
    const now = new Date("2026-10-22T20:00:00.000Z");
    expect(dateRangeForPreset("month", now)).toEqual({ preset: "month", from: "2026-10-01", to: "2026-10-23" });
    expect(dateRangeForPreset("year", now)).toEqual({ preset: "year", from: "2026-01-01", to: "2026-10-23" });
    expect(dateRangeForPreset("today", now)).toEqual({ preset: "today", from: "2026-10-23", to: "2026-10-23" });
  });
  it("uses the current Monday-to-date India calendar week", () => {
    expect(dateRangeForPreset("week", new Date("2026-10-22T20:00:00.000Z")))
      .toEqual({ preset: "week", from: "2026-10-19", to: "2026-10-23" });
  });
  it("converts inclusive India calendar days to UTC query bounds", () => {
    const bounds = dateRangeToUtcBounds({ from: "2026-10-23", to: "2026-10-23" });
    expect(bounds.from.toISOString()).toBe("2026-10-22T18:30:00.000Z");
    expect(bounds.toExclusive.toISOString()).toBe("2026-10-23T18:30:00.000Z");
  });
  it("rejects invalid and reversed date ranges", () => {
    expect(() => dateRangeToUtcBounds({ from: "2026-02-31", to: "2026-03-01" })).toThrow(RangeError);
    expect(() => dateRangeToUtcBounds({ from: "2026-03-02", to: "2026-03-01" })).toThrow(RangeError);
  });
  it("selects a complete custom calendar year", () => {
    expect(customYearRange(2024)).toEqual({ preset: "custom-year", from: "2024-01-01", to: "2024-12-31" });
  });
  it("uses the explicit brand tag over a default business value", () => {
    expect(businessForTransaction("Vaseegrah Veda", "Techvaseegrah")).toBe("Vaseegrah Veda");
    expect(businessForTransaction(undefined, "Spa Vaseegrah")).toBe("Spa Vaseegrah");
  });
  it("returns the business name unchanged from displayBusinessName", () => {
    expect(displayBusinessName("Vaseegrah Edibles")).toBe("Vaseegrah Edibles");
    expect(displayBusinessName("Spa Vaseegrah")).toBe("Spa Vaseegrah");
    expect(displayBusinessName("Techvaseegrah")).toBe("Techvaseegrah");
  });
  it("maps legacy Vaseegrah Vanam to Vaseegrah Edibles when normalising", () => {
    expect(businessNames).not.toContain("Vaseegrah Vanam");
    expect(normaliseBusinessName("Vaseegrah Vanam")).toBe("Vaseegrah Edibles");
    expect(normaliseBusinessName("Vaseegrah Edibles")).toBe("Vaseegrah Edibles");
  });
  it("uses payment status rather than order fulfillment status for financial totals", () => {
    expect(transactionStatus({ status: "packed", paymentStatus: "paid" }, "status")).toBe("paid");
    expect(transactionStatus({ status: "shipped" }, "status")).toBe("shipped");
    expect(transactionStatus({}, "status")).toBe("unknown");
  });
  it("maps currency amounts to paise and preserves explicitly minor-unit amounts", () => {
    expect(amountInMinorUnits(250, "amount")).toBe(25000);
    expect(amountInMinorUnits(250.5, "amount")).toBe(25050);
    expect(amountInMinorUnits(25000, "amountMinor")).toBe(25000);
  });
  it("schedules configured API syncs using each integration interval", () => {
    const now = new Date("2026-10-23T12:00:00.000Z");
    expect(isSyncDue(undefined, 1440, now)).toBe(true);
    expect(isSyncDue(new Date("2026-10-22T12:00:00.000Z"), 1440, now)).toBe(true);
    expect(isSyncDue(new Date("2026-10-23T11:00:00.000Z"), 1440, now)).toBe(false);
    expect(isSyncDue(new Date("2026-10-23T10:00:00.000Z"), 60, now)).toBe(true);
  });
  it("filters a shared transactions endpoint by transaction kind", () => {
    const contract = defaultContractFor("https://fynovo.example/api/v1/transactions");
    expect(contract.incomePath).toBe("?type=income");
    expect(contract.expensePath).toBe("?type=expense");
  });
  it("maps expense-specific IDs, dates, and amounts from the Fynovo expense API", () => {
    const fields = fynovoTransactionFields(
      { expenseId: "expense-1", expenseDate: "23/10/2026", expenseAmount: 275 },
      defaultContractFor("https://fynovo.example/api/v1/expenses").fields,
      "expense",
    );
    expect(fields.id).toBe("expense-1");
    expect(parseTransactionDate(fields.date).toISOString()).toBe("2026-10-23T00:00:00.000Z");
    expect(fields.amount).toEqual({ path: "expenseAmount", value: 275 });
    expect(amountInMinorUnits(fields.amount?.value, fields.amount?.path || "")).toBe(27500);
  });
  it("parses Fynovo dates displayed as day/month/year", () => {
    expect(parseTransactionDate("23/10/2026").toISOString()).toBe("2026-10-23T00:00:00.000Z");
    expect(Number.isNaN(parseTransactionDate("31/02/2026").getTime())).toBe(true);
  });
  it("formats INR amounts with paise precision", () => { expect(formatCurrency(12345678)).toBe("₹1,23,456.78"); });
});
