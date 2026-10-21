import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret } from "@/lib/encryption";
import { getApiKeyLast4 } from "@/lib/api-key";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncHistory } from "@/models/SyncHistory";
import type { IntegrationPublicData } from "@/types/financial";

type IntegrationRow = { _id: { toString(): string }; baseUrl: string; encryptedApiKey?: string; apiKeyLast4?: string; lastSyncAt?: Date; lastSyncStatus: IntegrationPublicData["lastSyncStatus"]; syncIntervalMinutes: number };
type HistoryRow = { _id: { toString(): string }; status: string; startedAt: Date; error?: string; transactionsProcessed: number };

export async function getIntegrationForUser(userId: string): Promise<IntegrationPublicData & { history: { id: string; status: string; startedAt: string; error?: string; transactionsProcessed: number }[] }> {
  if (process.env.DEMO_MODE === "true") return { configured: false, lastSyncStatus: "success", lastSyncAt: new Date().toISOString(), syncIntervalMinutes: 360, history: [] };
  await connectToDatabase();
  const integration = await FynovoIntegration.findOne({ userId }).select("+encryptedApiKey").lean() as unknown as IntegrationRow | null;
  if (!integration) return { configured: false, lastSyncStatus: "never", history: [] };
  let apiKeyLast4 = integration.apiKeyLast4;
  if (!apiKeyLast4 && integration.encryptedApiKey) {
    try { apiKeyLast4 = getApiKeyLast4(decryptSecret(integration.encryptedApiKey)); await FynovoIntegration.updateOne({ _id: integration._id }, { apiKeyLast4 }); } catch { /* Keep the settings page usable if an old key cannot be decrypted. */ }
  }
  const history = await SyncHistory.find({ integrationId: integration._id }).sort({ startedAt: -1 }).limit(5).lean() as unknown as HistoryRow[];
  return { configured: true, baseUrl: integration.baseUrl, apiKeyLast4, lastSyncAt: integration.lastSyncAt?.toISOString(), lastSyncStatus: integration.lastSyncStatus, syncIntervalMinutes: integration.syncIntervalMinutes, history: history.map((item) => ({ id: item._id.toString(), status: item.status, startedAt: item.startedAt.toISOString(), error: item.error, transactionsProcessed: item.transactionsProcessed })) };
}
