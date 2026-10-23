import { z } from "zod";
import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { getApiKeyLast4, getApiKeyPrefix } from "@/lib/api-key";
import { encryptSecret } from "@/lib/encryption";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { AuditLog } from "@/models/AuditLog";
import { businessNames } from "@/lib/businesses";
import { NextResponse } from "next/server";
import type { BusinessName } from "@/types/financial";

const urlSchema = z.string().url().max(500).optional().or(z.literal(""));

const schema = z.object({
  baseUrl: urlSchema,
  incomeBaseUrl: urlSchema,
  expenseBaseUrl: urlSchema,
  apiKey: z.string().min(8).max(512).optional().or(z.literal("")),
  apiKeyName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  syncIntervalMinutes: z.number().int().min(15).max(10_080),
});

export async function POST(request: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  if (!withinRateLimit(`brand-integration:${user.id}`, 20))
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });

  const { brand: brandParam } = await params;
  const brand = decodeURIComponent(brandParam) as BusinessName;
  if (!businessNames.includes(brand))
    return NextResponse.json({ error: "Unknown brand." }, { status: 400 });

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Please enter valid HTTPS URLs for Income and/or Expense endpoints." }, { status: 400 });

  const incomeBaseUrl = input.data.incomeBaseUrl?.trim() || "";
  const expenseBaseUrl = input.data.expenseBaseUrl?.trim() || "";
  const baseUrl = input.data.baseUrl?.trim() || incomeBaseUrl || expenseBaseUrl || "";

  if (!incomeBaseUrl && !expenseBaseUrl && !baseUrl) {
    return NextResponse.json({ error: "At least one valid API base URL (Income or Expense) is required." }, { status: 400 });
  }

  // Validate HTTPS
  for (const [name, u] of [["Income URL", incomeBaseUrl], ["Expense URL", expenseBaseUrl], ["Base URL", baseUrl]]) {
    if (u) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "https:") {
          return NextResponse.json({ error: `${name} must use HTTPS.` }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: `Invalid ${name}.` }, { status: 400 });
      }
    }
  }

  const apiKey = input.data.apiKey?.trim() || "";
  try {
    await connectToDatabase();
    const doc = await FynovoIntegration.findOne({ userId: user.id }).select("+brands.encryptedApiKey");
    type BrandItem = {
      brand: string;
      baseUrl?: string;
      incomeBaseUrl?: string;
      expenseBaseUrl?: string;
      encryptedApiKey?: string;
      apiKeyName?: string;
      apiKeyPrefix?: string;
      apiKeyLast4?: string;
      apiKeyCreatedAt?: Date;
      apiKeyStatus?: string;
    };
    const brands: BrandItem[] = (doc?.brands as BrandItem[]) ?? [];
    const existingIdx = brands.findIndex((b) => b.brand === brand);
    const existing = existingIdx >= 0 ? brands[existingIdx] : null;

    if (!existing && !apiKey) {
      return NextResponse.json({ error: "An API key is required to configure this brand connection." }, { status: 400 });
    }

    const brandUpdate: Record<string, unknown> = {
      brand,
      baseUrl: baseUrl.replace(/\/$/, ""),
      incomeBaseUrl: incomeBaseUrl.replace(/\/$/, ""),
      expenseBaseUrl: expenseBaseUrl.replace(/\/$/, ""),
      syncIntervalMinutes: input.data.syncIntervalMinutes,
      apiKeyName: input.data.apiKeyName || existing?.apiKeyName || brand,
    };

    if (apiKey) {
      brandUpdate.encryptedApiKey = encryptSecret(apiKey);
      brandUpdate.apiKeyPrefix = getApiKeyPrefix(apiKey);
      brandUpdate.apiKeyLast4 = getApiKeyLast4(apiKey);
      brandUpdate.apiKeyCreatedAt = new Date();
      brandUpdate.apiKeyStatus = "active";
    } else if (existing?.encryptedApiKey) {
      brandUpdate.encryptedApiKey = existing.encryptedApiKey;
      brandUpdate.apiKeyPrefix = existing.apiKeyPrefix;
      brandUpdate.apiKeyLast4 = existing.apiKeyLast4;
      brandUpdate.apiKeyCreatedAt = existing.apiKeyCreatedAt;
      brandUpdate.apiKeyStatus = existing.apiKeyStatus ?? "active";
    }

    if (doc) {
      if (existingIdx >= 0) {
        await FynovoIntegration.updateOne(
          { userId: user.id, "brands.brand": brand },
          { $set: { "brands.$": brandUpdate } },
        );
      } else {
        await FynovoIntegration.updateOne(
          { userId: user.id },
          { $push: { brands: brandUpdate } },
        );
      }
    } else {
      await FynovoIntegration.create({
        userId: user.id,
        baseUrl: baseUrl.replace(/\/$/, ""),
        incomeBaseUrl: incomeBaseUrl.replace(/\/$/, ""),
        expenseBaseUrl: expenseBaseUrl.replace(/\/$/, ""),
        encryptedApiKey: apiKey ? encryptSecret(apiKey) : "placeholder",
        lastSyncStatus: "never",
        brands: [brandUpdate],
      });
    }

    await AuditLog.create({
      userId: user.id,
      action: `brand.${existing ? "updated" : "created"}`,
      metadata: { brand, incomeBaseUrl, expenseBaseUrl },
    });

    return NextResponse.json({
      ok: true,
      apiKeyPrefix: (brandUpdate.apiKeyPrefix as string | undefined) ?? null,
      apiKeyLast4: (brandUpdate.apiKeyLast4 as string | undefined) ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (message.includes("ENCRYPTION_KEY"))
      return NextResponse.json({ error: "Server encryption is misconfigured." }, { status: 500 });
    return NextResponse.json({ error: "Unable to save brand settings." }, { status: 500 });
  }
}
