import { apiUser } from "@/lib/api-auth";
import { dateRangeToUtcBounds } from "@/lib/financial-calculations";
import { getTransactionsForUser } from "@/services/transaction-service";
import { NextResponse } from "next/server";
import type { DateRange, TransactionKind } from "@/types/financial";

export async function GET(request: Request) {
  const { user, response } = await apiUser();
  if (!user) return response!;

  const params = new URL(request.url).searchParams;
  const typeParam = params.get("type");
  if (typeParam && typeParam !== "income" && typeParam !== "expense") {
    return NextResponse.json({ error: "Invalid transaction type." }, { status: 400 });
  }
  const type: TransactionKind | undefined = typeParam === "income" || typeParam === "expense" ? typeParam : undefined;
  const from = params.get("from");
  const to = params.get("to");
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
    const transactions = await getTransactionsForUser(user.id, type, range);
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Transaction query failed.", {
      userId: user.id,
      type,
      from: range?.from,
      to: range?.to,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return NextResponse.json({ error: "Unable to load transactions. Please try again." }, { status: 503 });
  }
}
