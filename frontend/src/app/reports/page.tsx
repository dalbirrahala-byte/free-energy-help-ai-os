import { AppShell } from "@/components/layout/AppShell";
import { ExecutiveReportingDashboard } from "@/components/reports/ExecutiveReportingDashboard";

export default function ReportsPage() {
  return (
    <AppShell
      activeHref="/reports"
      title="Executive Reporting"
      subtitle="Cross-module analytics and forecasts (demonstration data)"
      headerContext="Reports"
    >
      <ExecutiveReportingDashboard />
    </AppShell>
  );
}
