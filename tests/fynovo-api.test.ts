import { afterEach, describe, expect, it, vi } from "vitest";
import { FynovoApiClient, type FynovoContract } from "../lib/fynovo-api";
import { resolveTransactionType } from "../lib/transaction-type";
import { encryptSecret, decryptSecret } from "../lib/encryption";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Fynovo API client", () => {
  it("fetches paginated income and expense endpoints using the configured API key", async () => {
    const calls: { url: URL; authorization: string | null }[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      calls.push({ url, authorization: new Headers(init?.headers).get("X-Fynovo-Key") });
      const type = url.searchParams.get("type");
      const page = url.searchParams.get("pageNumber");
      const body = type === "income" && page === "1"
        ? { data: { rows: [{ id: "i-1" }] }, meta: { next: "2" } }
        : type === "income"
          ? { data: { rows: [{ id: "i-2" }] }, meta: { next: null } }
          : { data: { rows: [{ id: "e-1" }] }, meta: { next: null } };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const contract: FynovoContract = {
      healthPath: "",
      incomePath: "?type=income",
      expensePath: "?type=expense",
      authHeader: "X-Fynovo-Key",
      authPrefix: "",
      pagination: {
        pageParam: "pageNumber",
        pageSizeParam: "pageSize",
        itemsPath: "data.rows",
        nextPagePath: "meta.next",
      },
      fields: { id: "id", date: "date", amount: "amount", category: "category", description: "description", paymentMethod: "method", status: "status" },
    };
    const client = new FynovoApiClient("https://fynovo.example/api/v1/transactions?tenant=demo", "secret-key", contract);

    await expect(client.list("income")).resolves.toEqual([{ id: "i-1" }, { id: "i-2" }]);
    await expect(client.list("expense")).resolves.toEqual([{ id: "e-1" }]);

    expect(calls).toHaveLength(3);
    expect(calls.map(({ url }) => url.searchParams.get("type"))).toEqual(["income", "income", "expense"]);
    expect(calls.map(({ url }) => url.searchParams.get("tenant"))).toEqual(["demo", "demo", "demo"]);
    expect(calls.map(({ url }) => url.searchParams.get("pageNumber"))).toEqual(["1", "2", "1"]);
    expect(calls.every(({ url }) => url.searchParams.get("pageSize") === "100")).toBe(true);
    expect(calls.every(({ authorization }) => authorization === "secret-key")).toBe(true);
  });

  it("falls back to alternative endpoint candidate if first candidate returns 404", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname.endsWith("/expense")) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      if (url.pathname.endsWith("/expenses")) {
        return new Response(JSON.stringify({ data: [{ id: "exp-1", amount: 500 }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const contract: FynovoContract = {
      healthPath: "",
      incomePath: "income",
      expensePath: "expense",
      fields: { id: "id", date: "date", amount: "amount", category: "category", description: "description", paymentMethod: "method", status: "status" },
    };
    const client = new FynovoApiClient("https://fynovo.example/api/v1", "secret-key", contract);

    const expenses = await client.list("expense");
    expect(expenses).toEqual([{ id: "exp-1", amount: 500 }]);
  });

  it("rejects pagination links that would send the API key to another server", async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ data: [{ id: "i-1" }], meta: { next: "https://attacker.example/collect" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const contract: FynovoContract = {
      healthPath: "",
      incomePath: "",
      expensePath: "",
      pagination: { nextPagePath: "meta.next" },
      fields: { id: "id", date: "date", amount: "amount", category: "category", description: "description", paymentMethod: "method", status: "status" },
    };
    const client = new FynovoApiClient("https://fynovo.example/api/v1/income", "secret-key", contract);

    await expect(client.list("income")).rejects.toThrow("different server");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("correctly resolves income and expenses from transaction types and amounts", () => {
    expect(resolveTransactionType({ type: "credit" }, 5000, "income")).toBe("income");
    expect(resolveTransactionType({ type: "income" }, 5000, "expense")).toBe("income");
    expect(resolveTransactionType({ type: "deposit" }, 5000, "expense")).toBe("income");
    expect(resolveTransactionType({ type: "debit" }, 5000, "income")).toBe("expense");
    expect(resolveTransactionType({ type: "expense" }, 5000, "income")).toBe("expense");
    expect(resolveTransactionType({ type: "withdrawal" }, 5000, "income")).toBe("expense");
    expect(resolveTransactionType({}, -2500, "income")).toBe("expense");
    expect(resolveTransactionType({}, 2500, "income")).toBe("income");
    expect(resolveTransactionType({}, 2500, "expense")).toBe("expense");
  });

  it("encrypts and decrypts secrets properly without key length mismatch", () => {
    process.env.ENCRYPTION_KEY = "dGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIDMyIGJ5dGVz";
    const secret = "live_secret_key_123456789";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });
});
