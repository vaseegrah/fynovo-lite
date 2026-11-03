import type { FynovoContract } from "@/lib/fynovo-api";

const defaultFields = {
  id: "id",
  date: "date",
  amount: "amount",
  category: "category",
  description: "description",
  paymentMethod: "paymentMode",
  status: "status",
  currency: "currency",
};

export const defaultTransactionsContract: FynovoContract = {
  healthPath: "",
  incomePath: "income",
  expensePath: "expense",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  fields: defaultFields,
};

export function defaultContractFor(baseUrl?: string): FynovoContract {
  if (!baseUrl) return defaultTransactionsContract;
  try {
    const url = new URL(baseUrl);
    const path = url.pathname.replace(/\/$/, "");
    if (path.endsWith("/income") || path.endsWith("/incomes")) {
      return {
        ...defaultTransactionsContract,
        incomePath: "",
        expensePath: "../expense",
      };
    }
    if (path.endsWith("/expenses") || path.endsWith("/expense")) {
      return {
        ...defaultTransactionsContract,
        incomePath: "../income",
        expensePath: "",
      };
    }
    if (path.endsWith("/transactions")) {
      // Some Fynovo instances support type filtering, but many return all records regardless.
      // Use the transactions endpoint as-is and rely on the 'type' field in each record
      // for categorization rather than a server-side filter that may be ignored.
      return {
        ...defaultTransactionsContract,
        incomePath: "",
        expensePath: "",
      };
    }
    return {
      ...defaultTransactionsContract,
      incomePath: "income",
      expensePath: "expense",
    };
  } catch { /* Fall through */ }
  return defaultTransactionsContract;
}

export function configuredFynovoContract(baseUrl?: string): FynovoContract | null {
  const raw = process.env.FYNOVO_CONTRACT_JSON;
  if (!raw) return defaultContractFor(baseUrl);
  try {
    const contract = JSON.parse(raw) as FynovoContract;
    if (!contract.fields) return defaultContractFor(baseUrl);
    return contract;
  } catch {
    return defaultContractFor(baseUrl);
  }
}
