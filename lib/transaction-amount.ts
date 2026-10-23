export function amountInMinorUnits(value: unknown, sourcePath: string): number {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return Number.NaN;
  if (/(minor|paise|cents)/i.test(sourcePath)) return Math.round(numeric);
  return Math.round(numeric * 100);
}
