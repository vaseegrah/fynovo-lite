import { AppShell } from "@/components/app-shell";
import { PageHeader, SyncButton } from "@/components/page-header";
import { TransactionsPage } from "@/components/transactions-page";
import { requireUser } from "@/lib/require-user";
import { getTransactionsForUser } from "@/services/transaction-service";

export default async function IncomePage() { const user = await requireUser(); const transactions = await getTransactionsForUser(user.id, "income"); return <AppShell><PageHeader eyebrow="INCOME MANAGEMENT" title="Income" action={<SyncButton />} /><TransactionsPage transactions={transactions} type="income" /></AppShell>; }
