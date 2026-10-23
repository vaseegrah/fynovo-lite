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
  incomePath: "",
  expensePath: "",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  fields: defaultFields,
};

export function defaultContractFor(baseUrl?: string): FynovoContract {
  if (!baseUrl) return defaultTransactionsContract;
  try {
    const url = new URL(baseUrl);
    const path = url.pathname.replace(/\/$/, "");
    if (path.endsWith("/income")) {
      return {
        ...defaultTransactionsContract,
        incomePath: "",
        expensePath: "",
      };
    }
    if (path.endsWith("/transactions")) {
      return {
        ...defaultTransactionsContract,
        incomePath: "",
        expensePath: "",
      };
    }
    if (path.endsWith("/expenses") || path.endsWith("/expense")) {
      return {
        ...defaultTransactionsContract,
        incomePath: "",
        expensePath: "",
      };
    }
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
