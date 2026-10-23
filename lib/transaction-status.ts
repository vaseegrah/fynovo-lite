const paidStatuses = new Set([
  "completed",
  "settled",
  "success",
  "received",
  "deposited",
  "credited",
  "posted",
  "approved",
  "paid",
]);

function field(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

export function transactionStatus(entry: unknown, configuredStatusPath: string): string {
  // If entry has a dedicated payment status, use that first
  const paymentStatusPaths = ["paymentStatus", "payment_status", "financialStatus", "financial_status"];
  const paymentValue = paymentStatusPaths.map((p) => field(entry, p)).find((item) => item !== undefined && item !== null && item !== "");
  if (paymentValue) {
    const s = String(paymentValue).toLowerCase();
    return paidStatuses.has(s) ? "paid" : s;
  }

  // Next check the configured status path
  const configuredValue = field(entry, configuredStatusPath);
  if (configuredValue) {
    const s = String(configuredValue).toLowerCase();
    return paidStatuses.has(s) ? "paid" : s;
  }

  // Fallback to generic status / state
  const fallbackPaths = ["status", "state"];
  const fallbackValue = fallbackPaths.map((p) => field(entry, p)).find((item) => item !== undefined && item !== null && item !== "");
  if (fallbackValue) {
    const s = String(fallbackValue).toLowerCase();
    return paidStatuses.has(s) ? "paid" : s;
  }

  return "unknown";
}
