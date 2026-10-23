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
    ? { id: ["incomeId", "income_id"], date: ["incomeDate", "income_date"], amount: ["incomeAmount", "income_amount"] }
    : { id: ["expenseId", "expense_id"], date: ["expenseDate", "expense_date"], amount: ["expenseAmount", "expense_amount"] };
  const id = firstFieldWithPath(entry, [
    fields.id, "_id", "externalId", "transaction_id", "transactionId", ...kindFields.id,
  ]);
  const date = firstFieldWithPath(entry, [
    fields.date, "transactionDate", "transaction_date", ...kindFields.date, "date", "createdAt", "created_at", "timestamp",
  ]);
  const amount = firstFieldWithPath(entry, [
    fields.amount, "amountMinor", "amount", "totalAmount", "total", "value", ...kindFields.amount,
  ]);
  return { id: id?.value, date: date?.value, amount };
}
