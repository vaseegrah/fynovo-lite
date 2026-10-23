import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { businessNames } from "@/lib/businesses";
import { syncBrandIntegration } from "@/services/brand-sync-service";
import { NextResponse } from "next/server";
import type { BusinessName } from "@/types/financial";

export async function POST(_request: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { user, response } = await apiUser();
  if (!user) return response!;
  if (!withinRateLimit(`brand-sync:${user.id}`, 6, 60_000))
    return NextResponse.json({ error: "A sync was recently requested. Please wait a moment." }, { status: 429 });

  const { brand: brandParam } = await params;
  const brand = decodeURIComponent(brandParam) as BusinessName;
  if (!businessNames.includes(brand))
    return NextResponse.json({ error: "Unknown brand." }, { status: 400 });

  try {
    return NextResponse.json(await syncBrandIntegration(user.id, brand));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Synchronization failed." }, { status: 502 });
  }
}
