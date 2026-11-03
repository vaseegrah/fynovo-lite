/**
 * Server-only Fynovo transport.
 * Supports pagination, error handling, timeouts, multi-endpoint candidate fallback, and response normalization.
 */
export interface FynovoContract {
  healthPath: string;
  incomePath: string;
  expensePath: string;
  authHeader?: string;
  authPrefix?: string;
  pagination?: { pageParam?: string; pageSizeParam?: string; itemsPath?: string; nextPagePath?: string };
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
    ...kindNames.flatMap((name) => [`data.${name}`, `result.${name}`, `payload.${name}`, `response.${name}`]),
    "data", "data.items", "data.transactions", "data.records", "data.rows", "data.list", "data.entries", "data.results", "data.data",
    "result", "result.items", "result.data", "result.records", "result.rows", "result.list", "result.entries",
    "payload", "payload.items", "payload.data", "payload.records", "payload.rows", "payload.list",
    "response", "response.items", "response.data", "response.records", "response.rows",
    "records", "rows", "list", "entries", "transactions", "results", "items",
  ];
  for (const path of paths) {
    const items = pathAt(data, path);
    if (Array.isArray(items)) return items;
  }
  return null;
}

export function combineUrl(baseUrl: string, subPath: string): URL {
  const base = new URL(baseUrl);
  if (!subPath) return base;
  if (/^https?:\/\//i.test(subPath)) return new URL(subPath);

  if (subPath.startsWith("?")) {
    const searchParams = new URLSearchParams(subPath.slice(1));
    searchParams.forEach((value, key) => base.searchParams.set(key, value));
    return base;
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const cleanSub = subPath.replace(/^\/+/, "");
  const [subPathOnly, subQuery] = cleanSub.split("?");

  if (basePath.endsWith(`/${subPathOnly}`) || basePath === `/${subPathOnly}`) {
    // Already ends with subpath
  } else {
    base.pathname = `${basePath}/${subPathOnly}`.replace(/\/+/g, "/");
  }

  if (subQuery) {
    const searchParams = new URLSearchParams(subQuery);
    searchParams.forEach((value, key) => base.searchParams.set(key, value));
  }
  return base;
}

export class FynovoApiClient {
  constructor(private baseUrl: string, private apiKey: string, private contract: FynovoContract) {}

  private endpointUrl(path: string, pageParam: string, pageSizeParam: string, page: string | number, limit: number) {
    const url = combineUrl(this.baseUrl, path);
    url.searchParams.set(pageParam, String(page));
    url.searchParams.set(pageSizeParam, String(limit));
    return url;
  }

  private async request(urlOrPath: string) {
    const url = combineUrl(this.baseUrl, urlOrPath).toString();
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

  private getCandidatePaths(kind: "income" | "expense"): string[] {
    const primary = kind === "income" ? this.contract.incomePath : this.contract.expensePath;
    const candidates: string[] = [];
    if (primary !== undefined && primary !== null) {
      candidates.push(primary);
    }

    try {
      const url = new URL(this.baseUrl);
      const path = url.pathname.replace(/\/+$/, "");

      if (kind === "expense") {
        if (path.endsWith("/expense") || path.endsWith("/expenses")) {
          candidates.push("", "expense", "expenses");
        } else if (path.endsWith("/income") || path.endsWith("/incomes")) {
          candidates.push("../expense", "../expenses", "expense", "expenses");
        } else {
          candidates.push("expense", "expenses", "../expense", "../expenses", "?type=expense", "transactions?type=expense");
        }
      } else {
        if (path.endsWith("/income") || path.endsWith("/incomes")) {
          candidates.push("", "income", "incomes");
        } else if (path.endsWith("/expense") || path.endsWith("/expenses")) {
          candidates.push("../income", "../incomes", "income", "incomes");
        } else {
          candidates.push("income", "incomes", "../income", "../incomes", "?type=income", "transactions?type=income");
        }
      }
    } catch {
      candidates.push(kind, kind === "expense" ? "expenses" : "incomes");
    }

    return Array.from(new Set(candidates));
  }

  /**
   * Fetches all items for a given kind, iterating over pages if pagination is supported.
   * If a path returns 404, it seamlessly attempts alternative endpoint candidates.
   */
  async list(kind: "income" | "expense"): Promise<unknown[]> {
    const candidatePaths = this.getCandidatePaths(kind);
    const limit = 100;
    const pageParam = this.contract.pagination?.pageParam || "page";
    const pageSizeParam = this.contract.pagination?.pageSizeParam || "limit";

    let winningPath: string | null = null;
    let firstPageItems: unknown[] | null = null;
    let firstPageRes: unknown = null;
    let lastError: FynovoApiError | null = null;

    // Discover the working endpoint path
    for (const candidate of candidatePaths) {
      try {
        const url = this.endpointUrl(candidate, pageParam, pageSizeParam, 1, limit);
        if (url.origin !== new URL(this.baseUrl).origin) {
          throw new FynovoApiError("Fynovo pagination returned a link to a different server.");
        }
        const res = await this.request(url.toString());
        const items = extractItems(res, this.contract.pagination?.itemsPath, kind);
        if (items) {
          winningPath = candidate;
          firstPageItems = items;
          firstPageRes = res;
          break;
        }
      } catch (err) {
        if (err instanceof FynovoApiError) {
          lastError = err;
          if (err.status === 404) {
            // Try next candidate path on 404
            continue;
          }
          if (err.status === 401 || err.status === 403) {
            throw err;
          }
        }
      }
    }

    if (winningPath === null || !firstPageItems) {
      if (lastError) throw lastError;
      throw new FynovoApiError(`The configured Fynovo response for ${kind} is not a transaction array.`);
    }

    const allItems: unknown[] = [...firstPageItems];
    const maxPages = 100;
    let page = 2;
    let pageValue: string | number = page;
    let nextUrl: string | undefined;

    // Check if first page already indicated more pages
    const initialPagination = (pathAt(firstPageRes, "pagination") ?? pathAt(firstPageRes, "meta.pagination") ?? pathAt(firstPageRes, "data.pagination")) as { total?: number } | undefined;
    const initialNextPage = this.contract.pagination?.nextPagePath ? pathAt(firstPageRes, this.contract.pagination.nextPagePath) : undefined;
    let hasMore = this.contract.pagination?.nextPagePath
      ? Boolean(initialNextPage)
      : initialPagination && typeof initialPagination.total === "number"
        ? allItems.length < initialPagination.total && firstPageItems.length > 0
        : firstPageItems.length === limit;

    if (initialNextPage) {
      if (typeof initialNextPage === "string" && (/^https?:\/\//i.test(initialNextPage) || initialNextPage.startsWith("/"))) {
        const candidate = new URL(initialNextPage, this.endpointUrl(winningPath, pageParam, pageSizeParam, 1, limit));
        if (candidate.origin !== new URL(this.baseUrl).origin) {
          throw new FynovoApiError("Fynovo pagination returned a link to a different server.");
        }
        nextUrl = candidate.toString();
      } else if (typeof initialNextPage === "string" || typeof initialNextPage === "number") {
        pageValue = initialNextPage;
      }
    }

    while (hasMore && page <= maxPages) {
      const url = nextUrl
        ? new URL(nextUrl, this.baseUrl)
        : this.endpointUrl(winningPath, pageParam, pageSizeParam, pageValue, limit);
      if (url.origin !== new URL(this.baseUrl).origin) {
        throw new FynovoApiError("Fynovo pagination returned a link to a different server.");
      }
      const res = await this.request(url.toString());
      const items = extractItems(res, this.contract.pagination?.itemsPath, kind);

      if (!items || items.length === 0) {
        break;
      }

      allItems.push(...items);

      const pagination = (pathAt(res, "pagination") ?? pathAt(res, "meta.pagination") ?? pathAt(res, "data.pagination")) as { total?: number } | undefined;
      const nextPage = this.contract.pagination?.nextPagePath ? pathAt(res, this.contract.pagination.nextPagePath) : undefined;

      if (this.contract.pagination?.nextPagePath) {
        hasMore = Boolean(nextPage);
        nextUrl = undefined;
        if (typeof nextPage === "string" && (/^https?:\/\//i.test(nextPage) || nextPage.startsWith("/"))) {
          const candidate = new URL(nextPage, url);
          if (candidate.origin !== url.origin) {
            throw new FynovoApiError("Fynovo pagination returned a link to a different server.");
          }
          nextUrl = candidate.toString();
        } else if (typeof nextPage === "string" || typeof nextPage === "number") {
          pageValue = nextPage;
        } else {
          pageValue = Number(pageValue) + 1;
        }
      } else if (pagination && typeof pagination.total === "number") {
        hasMore = allItems.length < pagination.total && items.length > 0;
        pageValue = Number(pageValue) + 1;
      } else {
        hasMore = items.length === limit;
        pageValue = Number(pageValue) + 1;
      }

      if (!hasMore) {
        break;
      }
      if (page === maxPages) {
        throw new FynovoApiError(`Fynovo returned more than ${maxPages} pages of ${kind} transactions.`);
      }
      page++;
    }

    return allItems;
  }
}
