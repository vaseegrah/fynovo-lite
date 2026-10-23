import { z } from "zod";
import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { FynovoApiClient, FynovoApiError } from "@/lib/fynovo-api";
import { decryptSecret } from "@/lib/encryption";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { businessNames } from "@/lib/businesses";
import { NextResponse } from "next/server";
import type { BusinessName } from "@/types/financial";

const urlSchema = z.string().url().max(500).optional().or(z.literal(""));

const schema = z.object({
  baseUrl: urlSchema,
  incomeBaseUrl: urlSchema,
  expenseBaseUrl: urlSchema,
  apiKey: z.string().min(8).max(512).optional().or(z.literal("")),
});

export async function POST(request: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  if (!withinRateLimit(`brand-test:${user.id}`, 10))
    return NextResponse.json({ error: "Too many connection tests. Please wait a minute." }, { status: 429 });

  const { brand: brandParam } = await params;
  const brand = decodeURIComponent(brandParam) as BusinessName;
  if (!businessNames.includes(brand))
    return NextResponse.json({ error: "Unknown brand." }, { status: 400 });

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Enter valid URL(s) to test." }, { status: 400 });

  const suppliedApiKey = input.data.apiKey?.trim() || "";
  const incomeBaseUrl = input.data.incomeBaseUrl?.trim() || "";
  const expenseBaseUrl = input.data.expenseBaseUrl?.trim() || "";
  const testUrl = incomeBaseUrl || expenseBaseUrl || input.data.baseUrl?.trim() || "";

  if (!testUrl)
    return NextResponse.json({ error: "Enter at least an Income URL or Expense URL." }, { status: 400 });

  const contract = configuredFynovoContract(testUrl);
  if (!contract)
    return NextResponse.json({ error: "Fynovo endpoint mapping could not be configured for this URL." }, { status: 422 });

  try {
    let apiKey = suppliedApiKey;
    if (!apiKey) {
      await connectToDatabase();
      const doc = await FynovoIntegration.findOne({ userId: user.id })
        .select("+brands.encryptedApiKey")
        .lean() as unknown as { brands?: { brand: string; encryptedApiKey?: string }[] } | null;
      const brandDoc = doc?.brands?.find((b) => b.brand === brand);
      if (!brandDoc?.encryptedApiKey)
        return NextResponse.json({ error: "Save an API key for this brand before testing." }, { status: 400 });
      apiKey = decryptSecret(brandDoc.encryptedApiKey);
    }

    // Validate using the endpoint
    await new FynovoApiClient(testUrl, apiKey, contract).validate();
    await FynovoIntegration.updateOne(
      { userId: user.id, "brands.brand": brand },
      { $set: { "brands.$.apiKeyLastUsedAt": new Date() } },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof FynovoApiError && error.status === 401 ? 401 : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connection test failed." }, { status });
  }
}
