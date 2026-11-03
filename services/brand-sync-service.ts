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
import { fynovoTransactionFields } from "@/lib/fynovo-transaction-fields";
import { resolveTransactionType } from "@/lib/transaction-type";
import { isSyncDue } from "@/lib/sync-schedule";
import { syncIntegration } from "@/services/sync-service";
import type { BusinessName } from "@/types/financial";

export { resolveTransactionType };

const field = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);

const firstField = (value: unknown, paths: string[]): unknown =>
  paths.map((path) => field(value, path)).find((item) => item !== undefined && item !== null && item !== "");

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

  let incomeUrl = brandIntegration.incomeBaseUrl?.trim() || brandIntegration.baseUrl?.trim() || "";
  let expenseUrl = brandIntegration.expenseBaseUrl?.trim() || brandIntegration.baseUrl?.trim() || "";

  // Derive missing URL from the other when only one is provided
  if (incomeUrl && !expenseUrl) {
    if (incomeUrl.endsWith("/income")) {
      expenseUrl = incomeUrl.replace(/\/income$/, "/expense");
    } else if (incomeUrl.endsWith("/incomes")) {
      expenseUrl = incomeUrl.replace(/\/incomes$/, "/expenses");
    } else {
      expenseUrl = incomeUrl;
    }
  } else if (expenseUrl && !incomeUrl) {
    if (expenseUrl.endsWith("/expense")) {
      incomeUrl = expenseUrl.replace(/\/expense$/, "/income");
    } else if (expenseUrl.endsWith("/expenses")) {
      incomeUrl = expenseUrl.replace(/\/expenses$/, "/income");
    } else {
      incomeUrl = expenseUrl;
    }
  }

  if (!incomeUrl && !expenseUrl) throw new Error(`Configure an Income or Expense API URL for ${brand}.`);

  const history = await SyncHistory.create({ userId, integrationId: integration._id, status: "running", brand });
  await FynovoIntegration.updateOne(
    { userId, "brands.brand": brand },
    { $set: { "brands.$.lastSyncStatus": "running" } },
  );

  try {
    const apiKey = decryptSecret(brandIntegration.encryptedApiKey);
    const tasks: { kind: "income" | "expense"; url: string; request: Promise<unknown[]> }[] = [];

    if (incomeUrl && expenseUrl && incomeUrl === expenseUrl) {
      // Both URLs point to the same endpoint (e.g. /transactions). Fetch once and split by type.
      const contract = configuredFynovoContract(incomeUrl);
      if (!contract) throw new Error(`No API contract is configured for ${brand}.`);
      // When incomePath === expensePath, we'll fetch once and the record type field splits them
      if (contract.incomePath === contract.expensePath) {
        console.log(`[brand-sync][${brand}] Same income/expense path (${contract.incomePath}), fetching combined and splitting by record type`);
        tasks.push({ kind: "income", url: incomeUrl, request: new FynovoApiClient(incomeUrl, apiKey, contract).list("income") });
      } else {
        tasks.push({ kind: "income", url: incomeUrl, request: new FynovoApiClient(incomeUrl, apiKey, contract).list("income") });
        tasks.push({ kind: "expense", url: expenseUrl, request: new FynovoApiClient(expenseUrl, apiKey, contract).list("expense") });
      }
    } else {
      if (incomeUrl) {
        const contract = configuredFynovoContract(incomeUrl);
        if (!contract) throw new Error(`No API contract is configured for ${brand} income.`);
        console.log(`[brand-sync][${brand}] Fetching income from ${incomeUrl} (path: ${contract.incomePath})`);
        tasks.push({ kind: "income", url: incomeUrl, request: new FynovoApiClient(incomeUrl, apiKey, contract).list("income") });
      }

      if (expenseUrl) {
        const contract = configuredFynovoContract(expenseUrl);
        if (!contract) throw new Error(`No API contract is configured for ${brand} expense.`);
        console.log(`[brand-sync][${brand}] Fetching expense from ${expenseUrl} (path: ${contract.expensePath})`);
        tasks.push({ kind: "expense", url: expenseUrl, request: new FynovoApiClient(expenseUrl, apiKey, contract).list("expense") });
      }
    }

    const taskResults = await Promise.allSettled(tasks.map((task) => task.request));
    let processed = 0;
    let skippedMissingId = 0;
    const fetchedByKind: Record<"income" | "expense", number> = { income: 0, expense: 0 };
    const statusCounts: Record<string, number> = {};
    const taskErrors: string[] = [];

    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
      const { kind, url } = tasks[taskIndex];
      const result = taskResults[taskIndex];
      if (result.status === "rejected") {
        const errMsg = result.reason instanceof Error ? result.reason.message : "Fetch failed";
        console.error(`[brand-sync][${brand}] ${kind} fetch failed:`, errMsg);
        taskErrors.push(`${kind}: ${errMsg}`);
        continue;
      }
      const entries = result.value;
      console.log(`[brand-sync][${brand}] ${kind} fetch succeeded: ${entries.length} records from ${url}`);
      fetchedByKind[kind] = entries.length;
      const contract = configuredFynovoContract(url);
      if (!contract) throw new Error(`No API contract is configured for ${brand} ${kind}.`);

      for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
        const entry = entries[entryIndex];
        const fields = contract.fields;
        const mappedFields = fynovoTransactionFields(entry, fields, kind);

        const amountField = mappedFields.amount;
        const rawAmount = amountField ? amountInMinorUnits(amountField.value, amountField.path) : Number.NaN;
        if (!Number.isSafeInteger(rawAmount)) continue;
        const amount = Math.abs(rawAmount);

        const transactionDate = parseTransactionDate(mappedFields.date);
        if (Number.isNaN(transactionDate.getTime())) continue;

        const originalId = String(mappedFields.id ?? "").trim() ||
          `fynovo_${kind}_${transactionDate.getTime()}_${amount}_${entryIndex}`;

        const status = transactionStatus(entry, fields.status);
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Always resolve the actual transaction type from the record's own 'type' field.
        // This is critical when the configured expense URL (e.g. /transactions) returns
        // records of both types and the server ignores ?type=expense query parameters.
        const finalType = resolveTransactionType(entry, rawAmount, kind);

        // Update per-kind counters using the final resolved type
        fetchedByKind[finalType] = (fetchedByKind[finalType] || 0) + 1;

        await SyncedTransaction.updateOne(
          { userId, brand, originalTransactionId: originalId },
          {
            $set: {
              integrationId: integration._id,
              type: finalType,
              transactionDate,
              amountMinor: amount,
              description: textValue(firstField(entry, [
                fields.description,
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
                `${fields.category}.name`,
                `${fields.category}.title`,
                "category.name",
                "category.title",
                "categoryName",
                "category_name",
                fields.category,
                "category",
              ]), "Uncategorised"),
              subcategory: textValue(firstField(entry, [
                "subcategory.name",
                "subCategory.name",
                "sub_category.name",
                "subcategory.title",
                "subcategoryName",
                "subCategoryName",
                "sub_category_name",
                "subcategory",
                "subCategory",
                "sub_category",
              ]), ""),
              paymentMethod: textValue(firstField(entry, [
                fields.paymentMethod,
                "paymentMode",
                "payment_mode",
                "paymentMethod",
                "payment_method",
                "mode",
                "method",
                "payment_type",
              ]), ""),
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

    if (tasks.length > 0 && taskErrors.length === tasks.length) {
      throw new Error(taskErrors.join("; "));
    }

    const incomeCount = fetchedByKind.income;
    const expenseCount = fetchedByKind.expense;
    console.log(`[brand-sync][${brand}] Sync complete: ${processed} processed, ${incomeCount} income, ${expenseCount} expense, errors: ${taskErrors.length}`);

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
    .select("+encryptedApiKey +brands.encryptedApiKey")
    .lean() as unknown as {
      encryptedApiKey?: string;
      baseUrl?: string;
      incomeBaseUrl?: string;
      expenseBaseUrl?: string;
      brands?: BrandIntegrationRow[];
    } | null;
  const configuredBrands = (integration?.brands || []).filter((item) =>
    item.encryptedApiKey && (item.baseUrl || item.incomeBaseUrl || item.expenseBaseUrl),
  );

  if (!configuredBrands.length) {
    const hasLegacyIntegration = integration?.encryptedApiKey
      && (integration?.baseUrl || integration?.incomeBaseUrl || integration?.expenseBaseUrl);
    if (hasLegacyIntegration) {
      return syncIntegration(userId);
    }
    throw new Error("Configure at least one brand API key and endpoint in Settings before syncing.");
  }

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
