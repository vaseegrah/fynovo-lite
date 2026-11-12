import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

const defaults = {
  timezone: "Asia/Kolkata",
  settings: {
    remindersEnabled: true,
    reminderTime: "09:00",
    remindUpcoming: true,
    upcomingDaysBefore: 1,
    theme: "system",
  },
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ user: { ...session, ...defaults } });
}
