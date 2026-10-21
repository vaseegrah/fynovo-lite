import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReportsPage } from "@/components/reports-page";
import { requireUser } from "@/lib/require-user";
import { getTransactionsForUser } from "@/services/transaction-service";

export default async function Reports() { const user = await requireUser(); const transactions = await getTransactionsForUser(user.id); return <AppShell><PageHeader eyebrow="FINANCIAL REPORTING" title="Reports" /><ReportsPage transactions={transactions} /></AppShell>; }
