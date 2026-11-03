import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret } from "@/lib/encryption";
import { getApiKeyLast4, getApiKeyPrefix } from "@/lib/api-key";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncHistory } from "@/models/SyncHistory";
import { businessNames } from "@/lib/businesses";
import type { IntegrationPublicData, BrandIntegration, BusinessName } from "@/types/financial";

type IntegrationRow = {
  _id: { toString(): string };
  baseUrl: string;
  incomeBaseUrl?: string;
  expenseBaseUrl?: string;
  encryptedApiKey?: string;
  apiKeyName?: string;
  apiKeyPrefix?: string;
  apiKeyLast4?: string;
  apiKeyPermissions?: string[];
  apiKeyCreatedAt?: Date;
  apiKeyExpiresAt?: Date;
  apiKeyLastUsedAt?: Date;
  apiKeyStatus?: IntegrationPublicData["apiKeyStatus"];
  createdAt?: Date;
  lastSyncAt?: Date;
  lastSyncStatus: IntegrationPublicData["lastSyncStatus"];
  syncIntervalMinutes: number;
  brands?: BrandRow[];
};

type BrandRow = {
  brand: BusinessName;
  baseUrl?: string;
  incomeBaseUrl?: string;
  expenseBaseUrl?: string;
  encryptedApiKey?: string;
  apiKeyName?: string;
  apiKeyPrefix?: string;
  apiKeyLast4?: string;
  apiKeyPermissions?: string[];
  apiKeyCreatedAt?: Date;
  apiKeyExpiresAt?: Date;
  apiKeyLastUsedAt?: Date;
  apiKeyStatus?: IntegrationPublicData["apiKeyStatus"];
  lastSyncAt?: Date;
  lastSyncStatus?: IntegrationPublicData["lastSyncStatus"];
  syncIntervalMinutes?: number;
};

type HistoryRow = { _id: { toString(): string }; status: string; startedAt: Date; error?: string; transactionsProcessed: number };

export async function getIntegrationForUser(userId: string): Promise<IntegrationPublicData & { history: { id: string; status: string; startedAt: string; error?: string; transactionsProcessed: number }[]; brands: BrandIntegration[] }> {
  await connectToDatabase();
  const integration = await FynovoIntegration.findOne({ userId }).select("+encryptedApiKey +brands.encryptedApiKey").lean() as unknown as IntegrationRow | null;
  if (!integration) {
    return {
      configured: false,
      lastSyncStatus: "never",
      history: [],
      brands: businessNames.map((brand) => ({ brand, configured: false, lastSyncStatus: "never" })),
    };
  }

  // Backfill legacy key prefix/last4 if missing
  let apiKeyLast4 = integration.apiKeyLast4;
  let apiKeyPrefix = integration.apiKeyPrefix;
  if ((!apiKeyLast4 || !apiKeyPrefix) && integration.encryptedApiKey) {
    try {
      const decryptedKey = decryptSecret(integration.encryptedApiKey);
      apiKeyLast4 ||= getApiKeyLast4(decryptedKey);
      apiKeyPrefix ||= getApiKeyPrefix(decryptedKey);
      await FynovoIntegration.updateOne({ _id: integration._id }, { apiKeyLast4, apiKeyPrefix });
    } catch { /* Keep the settings page usable if an old key cannot be decrypted. */ }
  }

  const apiKeyStatus = integration.apiKeyStatus === "revoked" ? "revoked" : integration.apiKeyExpiresAt && integration.apiKeyExpiresAt.getTime() < Date.now() ? "expired" : "active";
  const history = await SyncHistory.find({ integrationId: integration._id }).sort({ startedAt: -1 }).limit(5).lean() as unknown as HistoryRow[];

  // Map per-brand integrations
  const brands: BrandIntegration[] = businessNames.map((brand) => {
    const row = integration.brands?.find((b) => b.brand === brand);
    if (!row) return { brand, configured: false, lastSyncStatus: "never" };
    const status: BrandIntegration["apiKeyStatus"] = row.apiKeyStatus === "revoked" ? "revoked" : row.apiKeyExpiresAt && row.apiKeyExpiresAt.getTime() < Date.now() ? "expired" : "active";
    return {
      brand,
      configured: !!((row.baseUrl || row.incomeBaseUrl || row.expenseBaseUrl) && row.encryptedApiKey),
      baseUrl: row.baseUrl,
      incomeBaseUrl: row.incomeBaseUrl,
      expenseBaseUrl: row.expenseBaseUrl,
      apiKeyName: row.apiKeyName || brand,
      apiKeyPrefix: row.apiKeyPrefix,
      apiKeyLast4: row.apiKeyLast4,
      apiKeyPermissions: row.apiKeyPermissions || ["income:read", "expenses:read", "transactions:read"],
      apiKeyCreatedAt: row.apiKeyCreatedAt?.toISOString(),
      apiKeyExpiresAt: row.apiKeyExpiresAt?.toISOString(),
      apiKeyLastUsedAt: row.apiKeyLastUsedAt?.toISOString(),
      apiKeyStatus: status,
      lastSyncAt: row.lastSyncAt?.toISOString(),
      lastSyncStatus: row.lastSyncStatus || "never",
      syncIntervalMinutes: row.syncIntervalMinutes || 1440,
    };
  });

  return {
    configured: true,
    baseUrl: integration.baseUrl,
    incomeBaseUrl: integration.incomeBaseUrl,
    expenseBaseUrl: integration.expenseBaseUrl,
    apiKeyName: integration.apiKeyName || "fynovolive",
    apiKeyPrefix,
    apiKeyLast4,
    apiKeyPermissions: integration.apiKeyPermissions || ["income:read", "expenses:read", "transactions:read"],
    apiKeyCreatedAt: (integration.apiKeyCreatedAt || integration.createdAt)?.toISOString(),
    apiKeyExpiresAt: integration.apiKeyExpiresAt?.toISOString(),
    apiKeyLastUsedAt: integration.apiKeyLastUsedAt?.toISOString(),
    apiKeyStatus,
    lastSyncAt: integration.lastSyncAt?.toISOString(),
    lastSyncStatus: integration.lastSyncStatus,
    syncIntervalMinutes: integration.syncIntervalMinutes,
    history: history.map((item) => ({ id: item._id.toString(), status: item.status, startedAt: item.startedAt.toISOString(), error: item.error, transactionsProcessed: item.transactionsProcessed })),
    brands,
  };
}

export interface ExternalTransaction {
  externalId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
}

interface APIResponse {
  transactions?: Array<{
    id?: string;
    transaction_id?: string;
    externalId?: string;
    type?: "income" | "expense" | "credit" | "debit";
    amount: number;
    category?: string;
    description?: string;
    name?: string;
    date?: string;
    created_at?: string;
  }>;
  data?: Array<{
    id?: string;
    transaction_id?: string;
    externalId?: string;
    type?: "income" | "expense" | "credit" | "debit";
    amount: number;
    category?: string;
    description?: string;
    name?: string;
    date?: string;
    created_at?: string;
  }>;
  error?: string;
  message?: string;
}

function normalizeType(raw: string | undefined, amount: number): "income" | "expense" {
  if (raw === "income" || raw === "credit") return "income";
  if (raw === "expense" || raw === "debit") return "expense";
  return amount >= 0 ? "income" : "expense";
}

function normalizeTransaction(raw: any): ExternalTransaction {
  const amount = Math.abs(Number(raw.amount) || 0);
  return {
    externalId: raw.id || raw.transaction_id || raw.externalId || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: normalizeType(raw.type, raw.amount),
    amount,
    category: raw.category || "other",
    description: raw.description || raw.name || "API Transaction",
    date: new Date(raw.date || raw.created_at || Date.now()),
  };
}

export async function fetchTransactionsFromAPI(apiKey: string): Promise<ExternalTransaction[]> {
  if (!apiKey || apiKey.trim().length === 0) {
    console.warn("[integration] No API key provided, skipping fetch.");
    return [];
  }

  const apiBaseUrl = process.env.FINANCIAL_API_URL || "https://api.fyno.finance/v1";
  const endpoint = `${apiBaseUrl}/transactions`;

  console.log(`[integration] Fetching transactions from ${endpoint} with key ${apiKey.substring(0, 4)}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[integration] API returned ${response.status}: ${errorText}`);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const body = await response.json() as APIResponse;
    let rawTransactions: any[] = [];

    if (Array.isArray(body)) {
      rawTransactions = body;
    } else if (body.transactions && Array.isArray(body.transactions)) {
      rawTransactions = body.transactions;
    } else if (body.data && Array.isArray(body.data)) {
      rawTransactions = body.data;
    } else {
      console.warn("[integration] Unrecognised response shape, returning empty.", Object.keys(body));
      return [];
    }

    const transactions = rawTransactions
      .filter((t) => t && typeof t.amount !== "undefined")
      .map(normalizeTransaction);

    console.log(`[integration] Fetched ${transactions.length} transactions.`);
    return transactions;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[integration] Request timed out after 15s.");
    } else {
      console.error("[integration] Failed to fetch transactions:", error.message);
    }
    throw error;
  }
}
