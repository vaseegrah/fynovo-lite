import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function apiUser() {
  const user = await getSession();
  if (!user) return { user: null, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  return { user, response: null };
}

const hits = new Map<string, { count: number; reset: number }>();
export function withinRateLimit(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now(); const entry = hits.get(key);
  if (!entry || entry.reset <= now) { hits.set(key, { count: 1, reset: now + windowMs }); return true; }
  entry.count += 1; return entry.count <= max;
}
