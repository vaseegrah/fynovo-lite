import type { FinancialTransaction } from "@/types/financial";

export const demoTransactions: FinancialTransaction[] = [
  { id: "tx-001", originalId: "fyn-demo-001", type: "income", date: "2026-10-18", description: "Website design milestone", category: "Services", amount: 4850000, currency: "INR", paymentMethod: "Bank transfer", status: "paid", source: "demo" },
  { id: "tx-002", originalId: "fyn-demo-002", type: "income", date: "2026-10-16", description: "Monthly retainer — Neya", category: "Retainers", amount: 7500000, currency: "INR", paymentMethod: "UPI", status: "paid", source: "demo" },
  { id: "tx-003", originalId: "fyn-demo-003", type: "expense", date: "2026-10-17", description: "Team payroll", category: "Payroll", amount: 3210000, currency: "INR", paymentMethod: "Bank transfer", status: "paid", source: "demo" },
  { id: "tx-004", originalId: "fyn-demo-004", type: "expense", date: "2026-10-15", description: "Cloud hosting", category: "Software", amount: 890000, currency: "INR", paymentMethod: "Card", status: "paid", source: "demo" },
  { id: "tx-005", originalId: "fyn-demo-005", type: "expense", date: "2026-10-13", description: "Client workshop travel", category: "Travel", amount: 540000, currency: "INR", paymentMethod: "Card", status: "paid", source: "demo" },
  { id: "tx-006", originalId: "fyn-demo-006", type: "income", date: "2026-10-11", description: "Consulting engagement", category: "Services", amount: 2800000, currency: "INR", paymentMethod: "Bank transfer", status: "paid", source: "demo" },
  { id: "tx-007", originalId: "fyn-demo-007", type: "expense", date: "2026-10-09", description: "Figma organization", category: "Software", amount: 240000, currency: "INR", paymentMethod: "Card", status: "paid", source: "demo" },
  { id: "tx-008", originalId: "fyn-demo-008", type: "income", date: "2026-10-07", description: "Product strategy session", category: "Services", amount: 1500000, currency: "INR", paymentMethod: "UPI", status: "pending", source: "demo" },
  { id: "tx-009", originalId: "fyn-demo-009", type: "expense", date: "2026-10-03", description: "Social media campaign", category: "Marketing", amount: 700000, currency: "INR", paymentMethod: "Card", status: "paid", source: "demo" },
  { id: "tx-010", originalId: "fyn-demo-010", type: "income", date: "2026-09-29", description: "Mobile app discovery", category: "Services", amount: 3500000, currency: "INR", paymentMethod: "Bank transfer", status: "paid", source: "demo" },
];
