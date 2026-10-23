import { apiUser, withinRateLimit } from "@/lib/api-auth";
import { syncConfiguredBrandIntegrations } from "@/services/brand-sync-service";
import { NextResponse } from "next/server";

export async function POST() {
  const { user, response } = await apiUser(); if (!user) return response!;
  if (!withinRateLimit(`sync:${user.id}`, 3, 60_000)) return NextResponse.json({ error: "A sync was recently requested. Please wait a moment." }, { status: 429 });
  try { return NextResponse.json(await syncConfiguredBrandIntegrations(user.id)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Synchronization failed." }, { status: 502 }); }
}
