import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SettingsPage } from "@/components/settings-page";
import { requireUser } from "@/lib/require-user";
import { getIntegrationForUser } from "@/services/integration-service";
import { getPreferencesForUser } from "@/services/preferences-service";

export default async function Settings() {
  const user = await requireUser();
  const [integration, preferences] = await Promise.all([
    getIntegrationForUser(user.id),
    getPreferencesForUser(user.id),
  ]);
  return (
    <AppShell>
      <PageHeader eyebrow="CONNECTION & PREFERENCES" title="Settings" />
      <SettingsPage integration={integration} preferences={preferences} />
    </AppShell>
  );
}
