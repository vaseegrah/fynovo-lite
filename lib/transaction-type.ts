export function resolveTransactionType(
  entry: unknown,
  rawAmount: number,
  fallbackKind: "income" | "expense" = "income",
): "income" | "expense" {
  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const rawType = String(
      record.type ||
      record.transactionType ||
      record.transaction_type ||
      record.paymentType ||
      record.payment_type ||
      record.entryType ||
      record.entry_type ||
      record.kind ||
      ""
    ).toLowerCase().trim();

    if (["income", "credit", "cr", "deposit", "sale", "refund_reversal"].includes(rawType)) {
      return "income";
    }
    if (["expense", "debit", "dr", "withdrawal", "purchase", "payout", "charge", "refund"].includes(rawType)) {
      return "expense";
    }
  }

  // A negative raw amount indicates an expense
  if (rawAmount < 0) {
    return "expense";
  }

  return fallbackKind;
}

