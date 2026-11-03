type TransactionFieldConfig = {
  id: string;
  date: string;
  amount: string;
};

const field = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);

const firstFieldWithPath = (value: unknown, paths: string[]) =>
  paths.map((path) => ({ path, value: field(value, path) }))
    .find((item) => item.value !== undefined && item.value !== null && item.value !== "");

export function fynovoTransactionFields(
  entry: unknown,
  fields: TransactionFieldConfig,
  kind: "income" | "expense",
) {
  const kindFields = kind === "income"
    ? {
        id: ["incomeId", "income_id", "incomeIdStr", "income_id_str", "incomeNo", "income_no"],
        date: ["incomeDate", "income_date", "receivedAt", "received_at", "depositDate", "deposit_date"],
        amount: ["incomeAmount", "income_amount", "receivedAmount", "received_amount"],
      }
    : {
        id: ["expenseId", "expense_id", "expenseIdStr", "expense_id_str", "expenseNo", "expense_no"],
        date: ["expenseDate", "expense_date", "spentAt", "spent_at", "paymentDate", "payment_date"],
        amount: ["expenseAmount", "expense_amount", "spentAmount", "spent_amount"],
      };

  const id = firstFieldWithPath(entry, [
    fields.id,
    "_id",
    "id",
    "externalId",
    "external_id",
    "transactionId",
    "transaction_id",
    "entryId",
    "entry_id",
    "recordId",
    "record_id",
    "ref",
    "reference",
    "referenceNo",
    "reference_no",
    "voucherNo",
    "voucher_no",
    "invoiceNo",
    "invoice_no",
    ...kindFields.id,
  ]);

  const date = firstFieldWithPath(entry, [
    fields.date,
    ...kindFields.date,
    "transactionDate",
    "transaction_date",
    "entryDate",
    "entry_date",
    "date",
    "paymentDate",
    "payment_date",
    "created_at",
    "createdAt",
    "timestamp",
    "updated_at",
    "updatedAt",
  ]);

  const amount = firstFieldWithPath(entry, [
    fields.amount,
    ...kindFields.amount,
    "amountMinor",
    "amount_minor",
    "amount",
    "totalAmount",
    "total_amount",
    "total",
    "value",
    "netAmount",
    "net_amount",
    "price",
  ]);

  return { id: id?.value, date: date?.value, amount };
}
