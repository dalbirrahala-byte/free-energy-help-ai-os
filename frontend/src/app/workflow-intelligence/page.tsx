import { AppShell } from "@/components/layout/AppShell";
import { WorkflowIntelligenceDashboard } from "@/components/workflow-intelligence/WorkflowIntelligenceDashboard";

export default function WorkflowIntelligencePage() {
  return (
    <AppShell
      activeHref="/workflow-intelligence"
      title="Workflow Intelligence"
      subtitle="Shared business events, journeys, and orchestration preview (demonstration)"
      headerContext="Workflow Intelligence"
    >
      <WorkflowIntelligenceDashboard />
    </AppShell>
  );
}
