export type TransactionKind = "income" | "expense";
export type TransactionStatus = "paid" | "pending" | "cancelled" | "refunded" | "voided";

export interface FinancialTransaction {
  id: string;
  originalId: string;
  type: TransactionKind;
  date: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: TransactionStatus;
  source: "fynovo" | "manual" | "demo";
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  profitMargin: number | null;
  totalTransactions: number;
}

export type DatePreset = "today" | "week" | "month" | "year" | "custom";

export interface DateRange {
  from: string;
  to: string;
  preset: DatePreset;
}

export interface IntegrationPublicData {
  configured: boolean;
  baseUrl?: string;
  apiKeyLast4?: string;
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed" | "running" | "never";
  syncIntervalMinutes?: number;
}
