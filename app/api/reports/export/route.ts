import { apiUser } from "@/lib/api-auth";
import { filterTransactions } from "@/lib/financial-calculations";
import { getTransactionsForUser } from "@/services/transaction-service";
import { NextResponse } from "next/server";

const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  const { user, response } = await apiUser(); if (!user) return response!;
  const url = new URL(request.url); const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return NextResponse.json({ error: "A valid reporting date range is required." }, { status: 400 });
  const transactions = filterTransactions(await getTransactionsForUser(user.id), { preset: "custom", from, to });
  const rows = [["Date", "Description", "Category", "Type", "Payment method", "Status", "Currency", "Amount (minor units)"], ...transactions.map((item) => [item.date, item.description, item.category, item.type, item.paymentMethod, item.status, item.currency, item.amount].map(escapeCsv).join(","))];
  return new NextResponse(rows.map((row) => Array.isArray(row) ? row.join(",") : row).join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fynovo-report-${from}-to-${to}.csv"` } });
}
