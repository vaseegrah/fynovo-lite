import { describe, expect, it } from "vitest";
import { calculateSummary, filterTransactions, formatCurrency, reportingDate } from "../lib/financial-calculations";
import { businessForTransaction } from "../lib/businesses";
import { transactionStatus } from "../lib/transaction-status";
import { amountInMinorUnits } from "../lib/transaction-amount";
import { isSyncDue } from "../lib/sync-schedule";
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
  it("excludes pending, cancelled and voided records", () => {
    const records = [transaction({ status: "pending" }), transaction({ id: "2", originalId: "2", status: "cancelled" }), transaction({ id: "3", originalId: "3", status: "voided" }), transaction({ id: "4", originalId: "4", status: "paid", amount: 50000 })];
    expect(filterTransactions(records)).toHaveLength(1); expect(calculateSummary(records).totalIncome).toBe(50000);
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
  it("uses the explicit brand tag over a default business value", () => {
    expect(businessForTransaction("Vaseegrah Veda", "Techvaseegrah")).toBe("Vaseegrah Veda");
    expect(businessForTransaction(undefined, "Spa Vaseegrah")).toBe("Spa Vaseegrah");
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
  it("formats INR amounts without floating point leakage", () => { expect(formatCurrency(12345678)).toBe("₹1,23,457"); });
});
