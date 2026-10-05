import { AppShell } from "@/components/layout/AppShell";
import { AiSalesAssistantDashboard } from "@/components/ai-assistant/AiSalesAssistantDashboard";

export default function AiAssistantPage() {
  return (
    <AppShell
      activeHref="/ai-assistant"
      title="AI Sales Assistant"
      subtitle="Briefings, sales intelligence and the approved FEH corporate voice profile"
      headerContext="AI Assistant"
    >
      <AiSalesAssistantDashboard />
    </AppShell>
  );
}
