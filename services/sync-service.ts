import { decryptSecret } from "@/lib/encryption";
import { FynovoApiClient, type FynovoContract } from "@/lib/fynovo-api";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import { SyncHistory } from "@/models/SyncHistory";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { normaliseBusinessName } from "@/lib/businesses";

const field = (value: unknown, path: string) => path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
const firstField = (value: unknown, paths: string[]) => paths.map((path) => field(value, path)).find((item) => item !== undefined && item !== null && item !== "");
const normaliseStatus = (value: unknown) => {
  const status = String(value ?? "paid").toLowerCase();
  return ["completed", "settled", "success", "received", "deposited", "credited", "posted", "approved"].includes(status) ? "paid" : status;
};

export async function syncIntegration(userId: string) {
  if (process.env.DEMO_MODE === "true") return { processed: 0, message: "Demo mode: sample data is already current." };
  await connectToDatabase();
  const integration = await FynovoIntegration.findOne({ userId }).select("+encryptedApiKey");
  if (!integration) throw new Error("Connect Fynovo before syncing.");
  const contract = configuredFynovoContract(integration.baseUrl) || (integration.apiContract as FynovoContract | undefined);
  if (!contract) throw new Error("A verified Fynovo endpoint contract is required before syncing.");
  const history = await SyncHistory.create({ userId, integrationId: integration._id, status: "running" });
  await FynovoIntegration.updateOne({ _id: integration._id }, { lastSyncStatus: "running" });
  try {
    const client = new FynovoApiClient(integration.baseUrl, decryptSecret(integration.encryptedApiKey), contract);
    const [income, expense] = await Promise.all([client.list("income"), client.list("expense")]);
    let processed = 0;
    for (const [type, entries] of [["income", income], ["expense", expense]] as const) {
      for (const entry of entries) {
        const spec = contract.fields;
        const originalId = String(firstField(entry, [spec.id, "_id", "externalId", "transaction_id", "transactionId"]) ?? "");
        if (!originalId) continue;
        const amount = Number(firstField(entry, [spec.amount, "amountMinor", "amount"]));
        if (!Number.isSafeInteger(amount)) throw new Error("Fynovo amount must map to an integer minor-unit value.");
        const transactionDate = new Date(String(firstField(entry, [spec.date, "transactionDate", "transaction_date", "createdAt"]) ?? ""));
        if (Number.isNaN(transactionDate.getTime())) throw new Error("Fynovo transaction date is invalid.");
        await SyncedTransaction.updateOne(
          { userId, integrationId: integration._id, originalTransactionId: originalId },
          { $set: { type, transactionDate, amountMinor: amount, description: String(firstField(entry, [spec.description, "title", "note", "merchant"]) ?? ""), category: String(firstField(entry, [spec.category, "category.name"]) ?? "Uncategorised"), paymentMethod: String(firstField(entry, [spec.paymentMethod, "paymentMode", "payment_method"]) ?? ""), business: normaliseBusinessName(firstField(entry, ["business", "businessName", "brand", "brandName", "store", "storeName", "organization"])), status: normaliseStatus(firstField(entry, [spec.status, "state"])), currency: String(firstField(entry, [spec.currency || "", "currency"]) ?? "INR"), rawPayload: entry } },
          { upsert: true },
        );
        processed++;
      }
    }
    const now = new Date();
    await Promise.all([
      FynovoIntegration.updateOne({ _id: integration._id }, { lastSyncStatus: "success", lastSyncAt: now, apiKeyLastUsedAt: now, $unset: { lastSyncError: 1 } }),
      SyncHistory.updateOne({ _id: history._id }, { status: "success", transactionsProcessed: processed, finishedAt: now }),
    ]);
    return { processed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronization failed.";
    await Promise.all([
      FynovoIntegration.updateOne({ _id: integration._id }, { lastSyncStatus: "failed", lastSyncError: message }),
      SyncHistory.updateOne({ _id: history._id }, { status: "failed", error: message, finishedAt: new Date() }),
    ]);
    throw new Error(message);
  }
}
