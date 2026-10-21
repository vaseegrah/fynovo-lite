import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { PageHeader, SyncButton } from "@/components/page-header";
import { requireUser } from "@/lib/require-user";
import { getTransactionsForUser } from "@/services/transaction-service";

export default async function HomePage() {
  const user = await requireUser();
  const [incomeTransactions, expenseTransactions] = await Promise.all([getTransactionsForUser(user.id, "income"), getTransactionsForUser(user.id, "expense")]);
  return <AppShell><PageHeader title="Overview" action={<SyncButton />} /><Dashboard incomeTransactions={incomeTransactions} expenseTransactions={expenseTransactions} userName={user.name} /></AppShell>;
}
