import { connectToDatabase } from "@/lib/mongodb";
import { reportingDate } from "@/lib/financial-calculations";
import { businessForTransaction } from "@/lib/businesses";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import type { FinancialTransaction, TransactionKind } from "@/types/financial";

type TransactionRow = {
  _id: { toString(): string }; originalTransactionId: string; type: TransactionKind; transactionDate: Date;
  brand?: FinancialTransaction["business"];
  description?: string; category?: string; subcategory?: string; amountMinor: number; currency?: string; paymentMethod?: string; business?: FinancialTransaction["business"]; status: string;
};

export async function getTransactionsForUser(userId: string, type?: TransactionKind): Promise<FinancialTransaction[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId };
  if (type) filter.type = type;
  const rows = await SyncedTransaction.find(filter).sort({ transactionDate: -1 }).lean() as unknown as TransactionRow[];
  return rows.map((row) => ({
    id: row._id.toString(), originalId: row.originalTransactionId, type: row.type as TransactionKind,
    date: reportingDate(new Date(row.transactionDate)), description: row.description || "Untitled transaction",
    category: row.category || "Uncategorised", subcategory: row.subcategory || undefined, amount: row.amountMinor, currency: row.currency || "INR",
    paymentMethod: row.paymentMethod || "—", business: businessForTransaction(row.brand, row.business), status: row.status as FinancialTransaction["status"], source: "fynovo",
  }));
}
