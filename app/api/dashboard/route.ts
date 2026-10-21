import { apiUser } from "@/lib/api-auth";
import { calculateSummary } from "@/lib/financial-calculations";
import { getTransactionsForUser } from "@/services/transaction-service";
import { NextResponse } from "next/server";

export async function GET() { const { user, response } = await apiUser(); if (!user) return response!; const transactions = await getTransactionsForUser(user.id); return NextResponse.json({ summary: calculateSummary(transactions), transactions }); }
