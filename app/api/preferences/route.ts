import { z } from "zod";
import { apiUser } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserPreferences } from "@/models/UserPreferences";
import { NextResponse } from "next/server";

const schema = z.object({ currency: z.enum(["INR", "USD", "EUR", "GBP"]), pendingTreatment: z.enum(["exclude", "include"]), reportStartDay: z.number().int().min(1).max(28) });
export async function POST(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const input = schema.safeParse(await request.json().catch(() => null)); if (!input.success) return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
  if (process.env.DEMO_MODE === "true") return NextResponse.json({ ok: true });
  await connectToDatabase(); await UserPreferences.findOneAndUpdate({ userId: user.id }, { $set: input.data, $setOnInsert: { userId: user.id } }, { upsert: true, runValidators: true });
  return NextResponse.json({ ok: true });
}
