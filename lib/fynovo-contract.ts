import type { FynovoContract } from "@/lib/fynovo-api";

const defaultFields = {
  id: "id",
  date: "date",
  amount: "amount",
  category: "category",
  description: "description",
  paymentMethod: "paymentMethod",
  status: "status",
  currency: "currency",
};

const defaultTransactionsContract: FynovoContract = {
  healthPath: "",
  incomePath: "?type=income&limit=100",
  expensePath: "?type=expense&limit=100",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  fields: defaultFields,
};

function defaultContractFor(baseUrl?: string): FynovoContract | null {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    const path = url.pathname.replace(/\/$/, "");
    if (path.endsWith("/transactions")) return defaultTransactionsContract;
    if (path.endsWith("/income")) return { ...defaultTransactionsContract, incomePath: "?limit=100", expensePath: `${path.replace(/\/income$/, "/expenses")}?limit=100` };
    if (path.endsWith("/expenses")) return { ...defaultTransactionsContract, incomePath: `${path.replace(/\/expenses$/, "/income")}?limit=100`, expensePath: "?limit=100" };
  } catch { /* Fall through to a custom contract. */ }
  return null;
}

export function configuredFynovoContract(baseUrl?: string): FynovoContract | null {
  const raw = process.env.FYNOVO_CONTRACT_JSON;
  if (!raw) return defaultContractFor(baseUrl);
  try {
    const contract = JSON.parse(raw) as FynovoContract;
    if (!contract.healthPath || !contract.incomePath || !contract.expensePath || !contract.fields) return null;
    return contract;
  } catch { return defaultContractFor(baseUrl); }
}
