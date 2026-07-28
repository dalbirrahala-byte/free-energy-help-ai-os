import { AppShell } from "@/components/layout/AppShell";
import { CommissionDashboard } from "@/components/commissions/CommissionDashboard";
import { getDemoCommissionRecords } from "@/lib/commissions/demo-data";

export default function CommissionsPage() {
  const records = getDemoCommissionRecords();

  return (
    <AppShell
      activeHref="/commissions"
      title="Commission Intelligence"
      subtitle="UK commercial energy brokerage — commission centre (demonstration data)"
      headerContext="Commissions"
    >
      <CommissionDashboard records={records} />
    </AppShell>
  );
}
