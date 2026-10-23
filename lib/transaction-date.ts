export function parseTransactionDate(value: unknown): Date {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(Number.NaN) : value;
  if (typeof value === "string") {
    const localDate = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (localDate) {
      const [, day, month, year] = localDate;
      const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() === Number(month) - 1 && parsed.getUTCDate() === Number(day)) {
        return parsed;
      }
      return new Date(Number.NaN);
    }
  }
  return new Date(String(value ?? ""));
}
