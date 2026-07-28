import { AppShell } from "@/components/layout/AppShell";
import { AutomationCentreDashboard } from "@/components/automation/AutomationCentreDashboard";

export default function AutomationPage() {
  return (
    <AppShell
      activeHref="/automation"
      title="Automation Centre"
      subtitle="Workflow register, approvals, and integration preview (demonstration)"
      headerContext="Automation"
    >
      <AutomationCentreDashboard />
    </AppShell>
  );
}
