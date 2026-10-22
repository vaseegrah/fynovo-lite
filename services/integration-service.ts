import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret } from "@/lib/encryption";
import { getApiKeyLast4, getApiKeyPrefix } from "@/lib/api-key";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncHistory } from "@/models/SyncHistory";
import type { IntegrationPublicData } from "@/types/financial";

type IntegrationRow = {
  _id: { toString(): string };
  baseUrl: string;
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
};
type HistoryRow = { _id: { toString(): string }; status: string; startedAt: Date; error?: string; transactionsProcessed: number };

export async function getIntegrationForUser(userId: string): Promise<IntegrationPublicData & { history: { id: string; status: string; startedAt: string; error?: string; transactionsProcessed: number }[] }> {
  if (process.env.DEMO_MODE === "true") return { configured: false, lastSyncStatus: "success", lastSyncAt: new Date().toISOString(), syncIntervalMinutes: 1440, history: [] };
  await connectToDatabase();
  const integration = await FynovoIntegration.findOne({ userId }).select("+encryptedApiKey").lean() as unknown as IntegrationRow | null;
  if (!integration) return { configured: false, lastSyncStatus: "never", history: [] };
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
  return {
    configured: true,
    baseUrl: integration.baseUrl,
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
  };
}
