import bcrypt from "bcryptjs";
import { z } from "zod";
import { withinRateLimit } from "@/lib/api-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createSession } from "@/lib/session";
import { User } from "@/models/User";
import { NextResponse } from "next/server";

const schema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!withinRateLimit(`login:${input.data.email.toLowerCase()}`, 8)) return NextResponse.json({ error: "Too many sign-in attempts. Please wait a minute." }, { status: 429 });
  try {
    await connectToDatabase(); const user = await User.findOne({ email: input.data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(input.data.password, user.passwordHash))) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    await createSession({ id: user._id.toString(), email: user.email, name: user.name }); return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 }); }
}
