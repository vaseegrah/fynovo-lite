import { decryptSecret } from "@/lib/encryption";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { FynovoApiClient } from "@/lib/fynovo-api";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import { SyncHistory } from "@/models/SyncHistory";
import { ensureSyncedTransactionIndexes } from "@/services/transaction-index-service";
import { amountInMinorUnits } from "@/lib/transaction-amount";
import { transactionStatus } from "@/lib/transaction-status";
import { parseTransactionDate } from "@/lib/transaction-date";
import { isSyncDue } from "@/lib/sync-schedule";
import { syncIntegration } from "@/services/sync-service";
import type { BusinessName } from "@/types/financial";

const field = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);

const firstField = (value: unknown, paths: string[]): unknown =>
  paths.map((path) => field(value, path)).find((item) => item !== undefined && item !== null && item !== "");

const firstFieldWithPath = (value: unknown, paths: string[]) =>
  paths.map((path) => ({ path, value: field(value, path) }))
    .find((item) => item.value !== undefined && item.value !== null && item.value !== "");

const textValue = (value: unknown, fallback: string): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

type BrandIntegrationRow = {
  brand: string;
  encryptedApiKey?: string;
  baseUrl?: string;
  incomeBaseUrl?: string;
  expenseBaseUrl?: string;
  syncIntervalMinutes?: number;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
};

export async function syncBrandIntegration(userId: string, brand: BusinessName) {
  await connectToDatabase();
  await ensureSyncedTransactionIndexes();

  const integration = await FynovoIntegration.findOne({ userId }).select("+brands.encryptedApiKey");
  if (!integration) throw new Error("Connect Fynovo before syncing.");

  const brandIntegration = (integration.brands as BrandIntegrationRow[]).find((item) => item.brand === brand);
  if (!brandIntegration?.encryptedApiKey) throw new Error(`Save an API key for ${brand} before syncing.`);

  const incomeUrl = brandIntegration.incomeBaseUrl || brandIntegration.baseUrl;
  const expenseUrl = brandIntegration.expenseBaseUrl || brandIntegration.baseUrl;
  if (!incomeUrl && !expenseUrl) throw new Error(`Configure an Income or Expense API URL for ${brand}.`);

  const history = await SyncHistory.create({ userId, integrationId: integration._id, status: "running", brand });
  await FynovoIntegration.updateOne(
    { userId, "brands.brand": brand },
    { $set: { "brands.$.lastSyncStatus": "running" } },
  );

  try {
    const apiKey = decryptSecret(brandIntegration.encryptedApiKey);
    const tasks: { kind: "income" | "expense"; url: string; request: Promise<unknown[]> }[] = [];

    if (incomeUrl) {
      const contract = configuredFynovoContract(incomeUrl);
      if (!contract) throw new Error(`No API contract is configured for ${brand} income.`);
      tasks.push({ kind: "income", url: incomeUrl, request: new FynovoApiClient(incomeUrl, apiKey, contract).list("income") });
    }

    if (expenseUrl) {
      const contract = configuredFynovoContract(expenseUrl);
      if (!contract) throw new Error(`No API contract is configured for ${brand} expense.`);
      tasks.push({ kind: "expense", url: expenseUrl, request: new FynovoApiClient(expenseUrl, apiKey, contract).list("expense") });
    }

    const responses = await Promise.all(tasks.map((task) => task.request));
    let processed = 0;
    let skippedMissingId = 0;
    const fetchedByKind: Record<"income" | "expense", number> = { income: 0, expense: 0 };
    const statusCounts: Record<string, number> = {};

    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
      const { kind, url } = tasks[taskIndex];
      const entries = responses[taskIndex];
      fetchedByKind[kind] = entries.length;
      const contract = configuredFynovoContract(url);
      if (!contract) throw new Error(`No API contract is configured for ${brand} ${kind}.`);

      for (const entry of entries) {
        const fields = contract.fields;
        const originalId = String(firstField(entry, [fields.id, "_id", "externalId", "transaction_id", "transactionId", "incomeId", "income_id"]) ?? "");
        if (!originalId) {
          skippedMissingId++;
          continue;
        }

        const amountField = firstFieldWithPath(entry, [fields.amount, "amountMinor", "amount", "totalAmount", "total", "value"]);
        const amount = amountField ? amountInMinorUnits(amountField.value, amountField.path) : Number.NaN;
        if (!Number.isSafeInteger(amount)) throw new Error("Fynovo amount must map to an integer minor-unit value.");

        const transactionDate = parseTransactionDate(firstField(entry, [fields.date, "transactionDate", "transaction_date", "incomeDate", "income_date", "createdAt", "created_at", "timestamp"]));
        if (Number.isNaN(transactionDate.getTime())) throw new Error("Fynovo transaction date is invalid.");
        
        const status = transactionStatus(entry, fields.status);
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // If the entry explicitly contains a type property (e.g. from /transactions), respect it
        const entryType = (typeof (entry as Record<string, unknown>).type === "string"
          ? String((entry as Record<string, unknown>).type).toLowerCase()
          : kind) as "income" | "expense";
        const finalType = entryType === "income" || entryType === "expense" ? entryType : kind;

        await SyncedTransaction.updateOne(
          { userId, brand, originalTransactionId: originalId },
          {
            $set: {
              integrationId: integration._id,
              type: finalType,
              transactionDate,
              amountMinor: amount,
              description: textValue(firstField(entry, [fields.description, "title", "note", "notes", "description", "merchant"]), ""),
              category: textValue(firstField(entry, [`${fields.category}.name`, `${fields.category}.title`, "category.name", "category.title", fields.category, "category"]), "Uncategorised"),
              subcategory: textValue(firstField(entry, ["subcategory.name", "subCategory.name", "sub_category.name", "subcategory.title", "subcategory", "subCategory", "sub_category"]), ""),
              paymentMethod: textValue(firstField(entry, [fields.paymentMethod, "paymentMode", "payment_method", "method"]), ""),
              brand,
              business: brand,
              status,
              currency: textValue(firstField(entry, [fields.currency || "", "currency"]), "INR"),
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
      FynovoIntegration.updateOne(
        { userId, "brands.brand": brand },
        { $set: { "brands.$.lastSyncStatus": "success", "brands.$.lastSyncAt": now, "brands.$.apiKeyLastUsedAt": now, $unset: { "brands.$.lastSyncError": 1 } } },
      ),
      SyncHistory.updateOne({ _id: history._id }, { status: "success", transactionsProcessed: processed, finishedAt: now }),
    ]);

    return { processed, fetchedByKind, skippedMissingId, statusCounts, brand };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronization failed.";
    await Promise.all([
      FynovoIntegration.updateOne(
        { userId, "brands.brand": brand },
        { $set: { "brands.$.lastSyncStatus": "failed", "brands.$.lastSyncError": message } },
      ),
      SyncHistory.updateOne({ _id: history._id }, { status: "failed", error: message, finishedAt: new Date() }),
    ]);
    throw new Error(message);
  }
}

export async function syncConfiguredBrandIntegrations(userId: string) {
  await connectToDatabase();
  const integration = await FynovoIntegration.findOne({ userId })
    .select("+brands.encryptedApiKey")
    .lean() as unknown as { brands?: BrandIntegrationRow[] } | null;
  const configuredBrands = (integration?.brands || []).filter((item) =>
    item.encryptedApiKey && (item.baseUrl || item.incomeBaseUrl || item.expenseBaseUrl),
  );

  if (!configuredBrands.length) throw new Error("Configure at least one brand API key and endpoint in Settings before syncing.");

  const results = await Promise.all(configuredBrands.map(async ({ brand }) => {
    try {
      return { ...await syncBrandIntegration(userId, brand as BusinessName), error: undefined };
    } catch (error) {
      return { brand, processed: 0, fetchedByKind: { income: 0, expense: 0 }, skippedMissingId: 0, statusCounts: {}, error: error instanceof Error ? error.message : "Synchronization failed." };
    }
  }));

  return {
    processed: results.reduce((total, result) => total + result.processed, 0),
    fetched: results.reduce((total, result) => total + result.fetchedByKind.income + result.fetchedByKind.expense, 0),
    skippedMissingId: results.reduce((total, result) => total + result.skippedMissingId, 0),
    statusCounts: results.reduce<Record<string, number>>((counts, result) => {
      for (const [status, count] of Object.entries(result.statusCounts)) counts[status] = (counts[status] || 0) + count;
      return counts;
    }, {}),
    brands: results,
    failed: results.filter((result) => result.error).length,
  };
}

export async function syncDueIntegrations(now: Date = new Date()) {
  await connectToDatabase();
  const integrations = await FynovoIntegration.find({})
    .select("+encryptedApiKey +brands.encryptedApiKey userId baseUrl incomeBaseUrl expenseBaseUrl lastSyncAt lastSyncStatus syncIntervalMinutes brands")
    .lean() as unknown as {
      userId: { toString(): string };
      encryptedApiKey?: string;
      baseUrl?: string;
      incomeBaseUrl?: string;
      expenseBaseUrl?: string;
      lastSyncAt?: Date;
      lastSyncStatus?: string;
      syncIntervalMinutes?: number;
      brands?: BrandIntegrationRow[];
    }[];

  const jobs: Promise<unknown>[] = [];
  for (const integration of integrations) {
    const userId = integration.userId.toString();
    const brandIntegrations = integration.brands || [];
    const configuredBrands = brandIntegrations.filter((item) =>
      item.encryptedApiKey && (item.baseUrl || item.incomeBaseUrl || item.expenseBaseUrl),
    );

    for (const item of configuredBrands) {
      if (item.lastSyncStatus !== "running" && isSyncDue(item.lastSyncAt, item.syncIntervalMinutes, now)) {
        jobs.push(syncBrandIntegration(userId, item.brand as BusinessName));
      }
    }

    const hasLegacyIntegration = integration.encryptedApiKey
      && (integration.baseUrl || integration.incomeBaseUrl || integration.expenseBaseUrl);
    if (!configuredBrands.length && hasLegacyIntegration && integration.lastSyncStatus !== "running"
      && isSyncDue(integration.lastSyncAt, integration.syncIntervalMinutes, now)) {
      jobs.push(syncIntegration(userId));
    }
  }

  const results = await Promise.allSettled(jobs);
  return {
    scheduled: jobs.length,
    processed: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
    errors: results.flatMap((result) => result.status === "rejected"
      ? [result.reason instanceof Error ? result.reason.message : "Synchronization failed."]
      : []),
  };
}
