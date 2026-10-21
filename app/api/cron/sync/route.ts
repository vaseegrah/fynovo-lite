import { connectToDatabase } from "@/lib/mongodb";
import { FynovoIntegration } from "@/models/FynovoIntegration";
import { syncIntegration } from "@/services/sync-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (process.env.DEMO_MODE === "true") return NextResponse.json({ ok: true, processed: 0, message: "No scheduled sync is needed in demo mode." });
  await connectToDatabase();
  const integrations = await FynovoIntegration.find({ lastSyncStatus: { $ne: "running" } }).select("userId lastSyncAt syncIntervalMinutes").lean();
  const now = Date.now();
  const due = integrations.filter((integration) => !integration.lastSyncAt || integration.lastSyncAt.getTime() <= now - (integration.syncIntervalMinutes || 360) * 60_000);
  const results = await Promise.allSettled(due.map((integration) => syncIntegration(integration.userId.toString())));
  return NextResponse.json({ ok: true, processed: results.filter((item) => item.status === "fulfilled").length, failed: results.filter((item) => item.status === "rejected").length });
}
