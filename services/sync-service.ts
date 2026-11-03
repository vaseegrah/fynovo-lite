import { decryptSecret } from "@/lib/encryption";
import { FynovoApiClient, type FynovoContract } from "@/lib/fynovo-api";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import { SyncHistory } from "@/models/SyncHistory";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { normaliseBusinessName } from "@/lib/businesses";
import { ensureSyncedTransactionIndexes } from "@/services/transaction-index-service";
import { amountInMinorUnits } from "@/lib/transaction-amount";
import { transactionStatus } from "@/lib/transaction-status";
import { parseTransactionDate } from "@/lib/transaction-date";
import { fynovoTransactionFields } from "@/lib/fynovo-transaction-fields";
import { resolveTransactionType } from "@/lib/transaction-type";

const field = (value: unknown, path: string) => path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
const firstField = (value: unknown, paths: string[]) => paths.map((path) => field(value, path)).find((item) => item !== undefined && item !== null && item !== "");
const textValue = (value: unknown, fallback: string) => typeof value === "string" || typeof value === "number" ? String(value) : fallback;

export async function syncIntegration(userId: string) {
  await connectToDatabase();
  await ensureSyncedTransactionIndexes();
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
      for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
        const entry = entries[entryIndex];
        const spec = contract.fields;
        const mappedFields = fynovoTransactionFields(entry, spec, type);
        const amountField = mappedFields.amount;
        const rawAmount = amountField ? amountInMinorUnits(amountField.value, amountField.path) : Number.NaN;
        if (!Number.isSafeInteger(rawAmount)) continue;
        const amount = Math.abs(rawAmount);
        const transactionDate = parseTransactionDate(mappedFields.date);
        if (Number.isNaN(transactionDate.getTime())) continue;

        const originalId = String(mappedFields.id ?? "").trim() ||
          `fynovo_${type}_${transactionDate.getTime()}_${amount}_${entryIndex}`;

        const finalType = resolveTransactionType(entry, rawAmount, type);
        await SyncedTransaction.updateOne(
          { userId, integrationId: integration._id, originalTransactionId: originalId },
          {
            $set: {
              type: finalType,
              transactionDate,
              amountMinor: amount,
              description: textValue(firstField(entry, [
                spec.description,
                "description",
                "notes",
                "note",
                "details",
                "additionalDetails",
                "additional_details",
                "remark",
                "remarks",
                "title",
                "merchant",
                "source",
                "sourceName",
                "source_name",
                "name",
              ]), ""),
              category: textValue(firstField(entry, [
                `${spec.category}.name`,
                `${spec.category}.title`,
                "category.name",
                "category.title",
                "categoryName",
                "category_name",
                spec.category,
                "category",
              ]), "Uncategorised"),
              paymentMethod: textValue(firstField(entry, [
                spec.paymentMethod,
                "paymentMode",
                "payment_mode",
                "paymentMethod",
                "payment_method",
                "mode",
                "method",
                "payment_type",
              ]), ""),
              business: normaliseBusinessName(firstField(entry, ["business.name", "business", "businessName", "brand.name", "brand", "brandName", "store.name", "store", "storeName", "organization"])),
              status: transactionStatus(entry, spec.status),
              currency: textValue(firstField(entry, [spec.currency || "", "currency"]), "INR"),
              rawPayload: entry,
            },
          },
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
