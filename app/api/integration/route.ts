import { z } from "zod";
import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { getApiKeyLast4, getApiKeyPrefix } from "@/lib/api-key";
import { encryptSecret } from "@/lib/encryption";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { AuditLog } from "@/models/AuditLog";
import { NextResponse } from "next/server";

const defaultPermissions = ["income:read", "expenses:read", "transactions:read"] as const;
const schema = z.object({
  baseUrl: z.string().url().max(500),
  apiKey: z.string().min(8).max(512).optional().or(z.literal("")),
  apiKeyName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  apiKeyExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  apiKeyPermissions: z.array(z.enum(defaultPermissions)).min(1).max(3).default([...defaultPermissions]),
  syncIntervalMinutes: z.number().int().min(15).max(10_080),
});
export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!withinRateLimit(`integration:${user.id}`, 10)) return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid HTTPS API base URL and sync interval." }, { status: 400 });
  const apiKey = input.data.apiKey?.trim() || "";
  try {
    const url = new URL(input.data.baseUrl); if (url.protocol !== "https:") return NextResponse.json({ error: "The Fynovo API URL must use HTTPS." }, { status: 400 });
    await connectToDatabase(); const existing = await FynovoIntegration.findOne({ userId: user.id });
    if (!existing && !apiKey) return NextResponse.json({ error: "An API key is required to create a connection." }, { status: 400 });
    const update: Record<string, unknown> = {
      baseUrl: url.toString().replace(/\/$/, ""),
      syncIntervalMinutes: input.data.syncIntervalMinutes,
      apiKeyName: input.data.apiKeyName || existing?.apiKeyName || "fynovolive",
      apiKeyPermissions: input.data.apiKeyPermissions,
    };
    const unset: Record<string, 1> = {};
    const contract = configuredFynovoContract(update.baseUrl as string); if (contract) update.apiContract = contract; else unset.apiContract = 1;
    if (input.data.apiKeyExpiresAt) {
      const expiresAt = new Date(`${input.data.apiKeyExpiresAt}T23:59:59.999Z`);
      if (Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Enter a valid expiration date." }, { status: 400 });
      update.apiKeyExpiresAt = expiresAt;
    } else {
      unset.apiKeyExpiresAt = 1;
    }
    if (apiKey) {
      update.encryptedApiKey = encryptSecret(apiKey);
      update.apiKeyPrefix = getApiKeyPrefix(apiKey);
      update.apiKeyLast4 = getApiKeyLast4(apiKey);
      update.apiKeyCreatedAt = new Date();
      update.apiKeyStatus = "active";
    }
    const operation: Record<string, unknown> = { $set: update, $setOnInsert: { userId: user.id, lastSyncStatus: "never" } };
    if (Object.keys(unset).length) operation.$unset = unset;
    await FynovoIntegration.findOneAndUpdate({ userId: user.id }, operation, { new: true, upsert: true, runValidators: true });
    await AuditLog.create({ userId: user.id, action: existing ? "integration.updated" : "integration.created", metadata: { baseUrl: update.baseUrl, syncIntervalMinutes: update.syncIntervalMinutes } });
    return NextResponse.json({ ok: true, apiKeyPrefix: (update.apiKeyPrefix as string | undefined) || existing?.apiKeyPrefix || null, apiKeyLast4: (update.apiKeyLast4 as string | undefined) || existing?.apiKeyLast4 || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown integration save error.";
    if (message.includes("ENCRYPTION_KEY")) return NextResponse.json({ error: "Server encryption is misconfigured. Set ENCRYPTION_KEY to a base64-encoded 32-byte key and restart the server." }, { status: 500 });
    if (/Mongo|Mongoose|database|timed out|ENOTFOUND|ECONNREFUSED/i.test(message)) return NextResponse.json({ error: "The database is unavailable. Check MONGODB_URI and the database network access list." }, { status: 503 });
    return NextResponse.json({ error: "Unable to save the integration settings." }, { status: 500 });
  }
}
