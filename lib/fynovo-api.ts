/**
 * Server-only Fynovo transport.
 * Supports pagination, error handling, timeouts, and multi-endpoint responses.
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

function extractItems(data: unknown, itemsPath: string | undefined, kind: "income" | "expense"): unknown[] | null {
  if (Array.isArray(data)) return data;
  const kindNames = kind === "income" ? ["income", "incomes"] : ["expense", "expenses"];
  const paths = [
    ...(itemsPath ? [itemsPath] : []),
    ...kindNames,
    ...kindNames.flatMap((name) => [`data.${name}`, `result.${name}`, `payload.${name}`]),
    "data", "data.items", "data.transactions", "data.results", "data.data",
    "result", "result.items", "result.data", "payload", "payload.items", "payload.data",
    "response", "response.items", "response.data", "transactions", "results", "items",
  ];
  for (const path of paths) {
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
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: {
          [this.contract.authHeader || "Authorization"]: `${this.contract.authPrefix ?? "Bearer "}${this.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new FynovoApiError(
          response.status === 401
            ? "Fynovo rejected the API key. Replace it with a valid key from the source platform."
            : response.status === 403
            ? "Fynovo API access forbidden. Check permissions."
            : response.status === 404
            ? "Fynovo endpoint not found. Verify the URL."
            : `Fynovo responded with ${response.status}.`,
          response.status,
        );
      }
      return await response.json() as unknown;
    } catch (error) {
      if (error instanceof FynovoApiError) throw error;
      throw new FynovoApiError(
        error instanceof Error && error.name === "AbortError"
          ? "Fynovo request timed out (15s)."
          : "Unable to reach Fynovo server.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async validate() {
    await this.request(this.contract.healthPath || "");
    return true;
  }

  /**
   * Fetches all items for a given kind, iterating over pages if pagination is supported.
   */
  async list(kind: "income" | "expense"): Promise<unknown[]> {
    const basePath = kind === "income" ? this.contract.incomePath : this.contract.expensePath;
    const allItems: unknown[] = [];
    const maxPages = 20; // safety ceiling
    const limit = 100;
    let page = 1;

    while (page <= maxPages) {
      const params = new URLSearchParams(basePath.startsWith("?") ? basePath.slice(1) : "");
      params.set("page", String(page));
      params.set("limit", String(limit));
      const pathWithoutQuery = basePath.split("?")[0];
      const pagedPath = `${pathWithoutQuery}?${params.toString()}`;

      const res = await this.request(pagedPath);
      const items = extractItems(res, this.contract.pagination?.itemsPath, kind);

      if (!items) {
        if (page === 1) {
          throw new FynovoApiError("The configured Fynovo response is not a transaction array.");
        }
        break;
      }

      allItems.push(...items);

      // Check pagination metadata if present
      const pagination = pathAt(res, "pagination") as { page?: number; total?: number; limit?: number } | undefined;
      if (pagination && typeof pagination.total === "number") {
        if (allItems.length >= pagination.total || items.length === 0) {
          break;
        }
      } else if (items.length < limit) {
        // If no explicit pagination total and returned fewer than limit, we're on the last page
        break;
      }

      page++;
    }

    return allItems;
  }
}
