/**
 * Server-only Fynovo transport. Endpoint paths and field mappings come from the
 * verified contract or the built-in /api/v1/transactions mapping.
 */
export interface FynovoContract {
  healthPath: string;
  incomePath: string;
  expensePath: string;
  authHeader?: string;
  authPrefix?: string;
  pagination?: { pageParam: string; pageSizeParam: string; itemsPath: string; nextPagePath?: string };
  fields: {
    id: string; date: string; amount: string; category: string; description: string;
    paymentMethod: string; status: string; currency?: string;
  };
}

export class FynovoApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

function pathAt(object: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key];
    return undefined;
  }, object);
}

function transactionItems(data: unknown, itemsPath?: string) {
  if (itemsPath) {
    const items = pathAt(data, itemsPath);
    if (Array.isArray(items)) return items;
  }
  if (Array.isArray(data)) return data;
  for (const path of ["data", "transactions", "results", "items", "data.transactions"]) {
    const items = pathAt(data, path);
    if (Array.isArray(items)) return items;
  }
  return null;
}

export class FynovoApiClient {
  constructor(private baseUrl: string, private apiKey: string, private contract: FynovoContract) {}

  private async request(path: string) {
    const url = new URL(path, this.baseUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: { [this.contract.authHeader || "Authorization"]: `${this.contract.authPrefix ?? "Bearer "}${this.apiKey}`, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new FynovoApiError(response.status === 401 ? "Fynovo rejected the API key. Replace it with a valid key from the source platform." : `Fynovo responded with ${response.status}.`, response.status);
      return await response.json() as unknown;
    } catch (error) {
      if (error instanceof FynovoApiError) throw error;
      throw new FynovoApiError(error instanceof Error && error.name === "AbortError" ? "Fynovo request timed out." : "Unable to reach Fynovo.");
    } finally { clearTimeout(timeout); }
  }

  async validate() { await this.request(this.contract.healthPath); return true; }

  async list(kind: "income" | "expense") {
    const data = await this.request(kind === "income" ? this.contract.incomePath : this.contract.expensePath);
    const items = transactionItems(data, this.contract.pagination?.itemsPath);
    if (!items) throw new FynovoApiError("The configured Fynovo response is not a transaction array.");
    return items;
  }
}
