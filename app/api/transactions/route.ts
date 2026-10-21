import { apiUser } from "@/lib/api-auth";
import { getTransactionsForUser } from "@/services/transaction-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) { const { user, response } = await apiUser(); if (!user) return response!; const type = new URL(request.url).searchParams.get("type"); if (type && type !== "income" && type !== "expense") return NextResponse.json({ error: "Invalid transaction type." }, { status: 400 }); return NextResponse.json({ transactions: await getTransactionsForUser(user.id, type as "income" | "expense" | undefined) }); }
