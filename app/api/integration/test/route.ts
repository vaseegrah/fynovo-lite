import { z } from "zod";
import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { configuredFynovoContract } from "@/lib/fynovo-contract";
import { FynovoApiClient, FynovoApiError } from "@/lib/fynovo-api";
import { decryptSecret } from "@/lib/encryption";
import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { NextResponse } from "next/server";

const schema = z.object({ baseUrl: z.string().url().max(500), apiKey: z.string().min(8).max(512).optional().or(z.literal("")) });
export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!withinRateLimit(`integration-test:${user.id}`, 5)) return NextResponse.json({ error: "Too many connection tests. Please wait a minute." }, { status: 429 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid API base URL." }, { status: 400 });
  const suppliedApiKey = input.data.apiKey?.trim() || "";
  const contract = configuredFynovoContract(input.data.baseUrl);
  if (!contract) return NextResponse.json({ error: "Fynovo endpoint mapping has not been configured. Add verified API documentation before testing a production key." }, { status: 422 });
  try {
    let apiKey = suppliedApiKey;
    if (!apiKey) {
      await connectToDatabase();
      const integration = await FynovoIntegration.findOne({ userId: user.id }).select("+encryptedApiKey").lean() as unknown as { encryptedApiKey?: string } | null;
      if (!integration?.encryptedApiKey) return NextResponse.json({ error: "Save an API key before testing the connection." }, { status: 400 });
      apiKey = decryptSecret(integration.encryptedApiKey);
    }
    await new FynovoApiClient(input.data.baseUrl, apiKey, contract).validate();
    await FynovoIntegration.updateOne({ userId: user.id }, { apiKeyLastUsedAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof FynovoApiError && error.status === 401 ? 401 : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connection test failed." }, { status });
  }
}
