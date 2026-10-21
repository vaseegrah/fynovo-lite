import { describe, expect, it } from "vitest";
import { calculateSummary, filterTransactions, formatCurrency } from "../lib/financial-calculations";
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
  it("formats INR amounts without floating point leakage", () => { expect(formatCurrency(12345678)).toBe("₹1,23,457"); });
});
