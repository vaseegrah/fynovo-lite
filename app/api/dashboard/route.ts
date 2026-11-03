import { apiUser } from "@/lib/api-auth";
import { calculateSummary, dateRangeToUtcBounds } from "@/lib/financial-calculations";
import { getBusinessSummariesForUser, getTransactionsForUser } from "@/services/transaction-service";
import { NextResponse } from "next/server";
import type { DateRange } from "@/types/financial";

export async function GET(request: Request) {
  const { user, response } = await apiUser();
  if (!user) return response!;

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const summaryOnly = params.get("summaryOnly") === "true";
  let range: DateRange | undefined;

  if (from || to) {
    if (!from || !to) return NextResponse.json({ error: "Both from and to dates are required." }, { status: 400 });
    range = { preset: "custom", from, to };
    try {
      dateRangeToUtcBounds(range);
    } catch {
      return NextResponse.json({ error: "Enter a valid date range." }, { status: 400 });
    }
  }

  try {
    if (summaryOnly) {
      const result = await getBusinessSummariesForUser(user.id, range);
      if (result.unassignedRecords > 0) {
        console.warn("Financial records have no recognized business tag.", {
          userId: user.id,
          from: range?.from,
          to: range?.to,
          unassignedRecords: result.unassignedRecords,
        });
      }
      return NextResponse.json(result);
    }

    const transactions = await getTransactionsForUser(user.id, undefined, range);
    return NextResponse.json({ summary: calculateSummary(transactions), transactions });
  } catch (error) {
    console.error("Dashboard data query failed.", {
      userId: user.id,
      from: range?.from,
      to: range?.to,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return NextResponse.json({ error: "Unable to load dashboard data. Please try again." }, { status: 503 });
  }
}
