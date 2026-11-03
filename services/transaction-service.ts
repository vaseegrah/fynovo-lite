import { connectToDatabase } from "@/lib/mongodb";
import { dateRangeToUtcBounds, reportingDate } from "@/lib/financial-calculations";
import { businessForTransaction, businessNames } from "@/lib/businesses";
import { SyncedTransaction } from "@/models/SyncedTransaction";
import { Types } from "mongoose";
import type { BusinessFinancialSummary, DateRange, FinancialSummary, FinancialTransaction, TransactionKind } from "@/types/financial";

type TransactionRow = {
  _id: { toString(): string }; originalTransactionId: string; type: TransactionKind; transactionDate: Date;
  brand?: FinancialTransaction["business"];
  description?: string; category?: string; subcategory?: string; amountMinor: number; currency?: string; paymentMethod?: string; business?: FinancialTransaction["business"]; status: string;
};

function objectIdForUser(userId: string) {
  if (!/^[\da-f]{24}$/i.test(userId)) throw new RangeError("Invalid authenticated user ID.");
  return new Types.ObjectId(userId);
}

export async function getTransactionsForUser(userId: string, type?: TransactionKind, range?: DateRange): Promise<FinancialTransaction[]> {
  const userObjectId = objectIdForUser(userId);
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId: userObjectId };
  if (type) filter.type = type;
  if (range) {
    const bounds = dateRangeToUtcBounds(range);
    filter.transactionDate = { $gte: bounds.from, $lt: bounds.toExclusive };
  }
  const rows = await SyncedTransaction.find(filter).sort({ transactionDate: -1 }).lean() as unknown as TransactionRow[];
  return rows.map((row) => ({
    id: row._id.toString(), originalId: row.originalTransactionId, type: row.type as TransactionKind,
    date: reportingDate(new Date(row.transactionDate)), description: row.description || "Untitled transaction",
    category: row.category || "Uncategorised", subcategory: row.subcategory || undefined, amount: row.amountMinor, currency: row.currency || "INR",
    paymentMethod: row.paymentMethod || "—", business: businessForTransaction(row.brand, row.business), status: row.status as FinancialTransaction["status"], source: "fynovo",
  }));
}

export async function getBusinessSummariesForUser(
  userId: string,
  range?: DateRange,
): Promise<{ summaries: BusinessFinancialSummary[]; unassignedRecords: number }> {
  const userObjectId = objectIdForUser(userId);
  await connectToDatabase();

  const transactionMatch: Record<string, unknown> = {
    userId: userObjectId,
    type: { $in: ["income", "expense"] },
    status: { $nin: ["cancelled", "voided", "refunded"] },
  };
  if (range) {
    const bounds = dateRangeToUtcBounds(range);
    transactionMatch.transactionDate = { $gte: bounds.from, $lt: bounds.toExclusive };
  }

  const grouped = await SyncedTransaction.aggregate<{
    _id: string | null;
    totalIncome: number;
    totalExpenses: number;
    totalTransactions: number;
  }>([
    {
      $match: transactionMatch,
    },
    {
      $project: {
        summaryBusiness: {
          $cond: [{ $eq: ["$brand", ""] }, "$business", { $ifNull: ["$brand", "$business"] }],
        },
        type: 1,
        amountMinor: 1,
      },
    },
    {
      $group: {
        _id: "$summaryBusiness",
        totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amountMinor", 0] } },
        totalExpenses: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amountMinor", 0] } },
        totalTransactions: { $sum: 1 },
      },
    },
  ]).exec();
  const assignedSummaries = grouped.filter((item) => businessNames.some((business) => business === item._id));
  const summaries = new Map(assignedSummaries.map((item) => [item._id, item]));

  const businessSummaries = businessNames.map((business) => {
    const totals = summaries.get(business);
    const totalIncome = totals?.totalIncome ?? 0;
    const totalExpenses = totals?.totalExpenses ?? 0;
    const difference = totalIncome - totalExpenses;
    const summary: FinancialSummary = {
      totalIncome,
      totalExpenses,
      netProfit: Math.max(difference, 0),
      netLoss: Math.max(-difference, 0),
      profitMargin: totalIncome > 0 ? Number(((Math.max(difference, 0) / totalIncome) * 100).toFixed(1)) : null,
      totalTransactions: totals?.totalTransactions ?? 0,
    };
    return { business, ...summary };
  });
  return {
    summaries: businessSummaries,
    unassignedRecords: grouped
      .filter((item) => !businessNames.some((business) => business === item._id))
      .reduce((count, item) => count + item.totalTransactions, 0),
  };
}
