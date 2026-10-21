import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";
import { NextResponse } from "next/server";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Check your name, email and password (8+ characters)." }, { status: 400 });
  if (process.env.DEMO_MODE === "true") return NextResponse.json({ error: "Registration is disabled in development demo mode." }, { status: 403 });
  try { await connectToDatabase(); const exists = await User.exists({ email: input.data.email.toLowerCase() }); if (exists) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 }); const user = await User.create({ name: input.data.name, email: input.data.email.toLowerCase(), passwordHash: await bcrypt.hash(input.data.password, 12) }); await createSession({ id: user._id.toString(), email: user.email, name: user.name }); return NextResponse.json({ ok: true }, { status: 201 }); } catch { return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 }); }
}
