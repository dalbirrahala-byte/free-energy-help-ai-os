import { AppShell } from "@/components/layout/AppShell";
import { RenewalsDashboard } from "@/components/renewals/RenewalsDashboard";
import { getDemoRenewalRecords } from "@/lib/renewals/demo-data";

export default function RenewalsIntelligencePage() {
  const records = getDemoRenewalRecords();

  return (
    <AppShell
      activeHref="/renewals"
      title="Renewals Intelligence"
      subtitle="30 / 60 / 90 day pipeline, risk, and renewal actions"
      headerContext="Renewals"
    >
      <RenewalsDashboard records={records} />
    </AppShell>
  );
}
