import { demoTransactions } from "@/lib/demo-data";
import { connectToDatabase } from "@/lib/mongodb";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import type { FinancialTransaction, TransactionKind } from "@/types/financial";

type TransactionRow = {
  _id: { toString(): string }; originalTransactionId: string; type: TransactionKind; transactionDate: Date;
  description?: string; category?: string; amountMinor: number; currency?: string; paymentMethod?: string; status: string;
};

export async function getTransactionsForUser(userId: string, type?: TransactionKind): Promise<FinancialTransaction[]> {
  if (process.env.DEMO_MODE === "true") return type ? demoTransactions.filter((item) => item.type === type) : demoTransactions;
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId };
  if (type) filter.type = type;
  const rows = await SyncedTransaction.find(filter).sort({ transactionDate: -1 }).lean() as unknown as TransactionRow[];
  return rows.map((row) => ({
    id: row._id.toString(), originalId: row.originalTransactionId, type: row.type as TransactionKind,
    date: new Date(row.transactionDate).toISOString().slice(0, 10), description: row.description || "Untitled transaction",
    category: row.category || "Uncategorised", amount: row.amountMinor, currency: row.currency || "INR",
    paymentMethod: row.paymentMethod || "—", status: row.status as FinancialTransaction["status"], source: "fynovo",
  }));
}
