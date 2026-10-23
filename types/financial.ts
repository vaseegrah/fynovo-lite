export type TransactionKind = "income" | "expense";
export type TransactionStatus = "paid" | "pending" | "cancelled" | "refunded" | "voided" | "unknown";
export type BusinessName = "Techvaseegrah" | "Vaseegrah Veda" | "Vaseegrah Vanam" | "Spa Vaseegrah";

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
  business?: BusinessName;
  status: TransactionStatus;
  source: "fynovo" | "manual";
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
  incomeBaseUrl?: string;
  expenseBaseUrl?: string;
  apiKeyName?: string;
  apiKeyPrefix?: string;
  apiKeyLast4?: string;
  apiKeyPermissions?: string[];
  apiKeyCreatedAt?: string;
  apiKeyExpiresAt?: string;
  apiKeyLastUsedAt?: string;
  apiKeyStatus?: "active" | "expired" | "revoked";
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed" | "running" | "never";
  syncIntervalMinutes?: number;
}

export interface BrandIntegration {
  brand: BusinessName;
  configured: boolean;
  baseUrl?: string;
  incomeBaseUrl?: string;
  expenseBaseUrl?: string;
  apiKeyName?: string;
  apiKeyPrefix?: string;
  apiKeyLast4?: string;
  apiKeyPermissions?: string[];
  apiKeyCreatedAt?: string;
  apiKeyExpiresAt?: string;
  apiKeyLastUsedAt?: string;
  apiKeyStatus?: "active" | "expired" | "revoked";
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "failed" | "running" | "never";
  syncIntervalMinutes?: number;
}
