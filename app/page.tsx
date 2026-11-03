import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { PageHeader, SyncButton } from "@/components/page-header";
import { dateRangeForPreset } from "@/lib/financial-calculations";
import { requireUser } from "@/lib/require-user";
import { getBusinessSummariesForUser } from "@/services/transaction-service";

export default async function HomePage() {
  const user = await requireUser();
  const initialRange = dateRangeForPreset("month");
  const { summaries, unassignedRecords } = await getBusinessSummariesForUser(user.id, initialRange);
  return <AppShell><PageHeader title="Overview" action={<SyncButton />} /><Dashboard initialSummaries={summaries} initialUnassignedRecords={unassignedRecords} userName={user.name} /></AppShell>;
}
