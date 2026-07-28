import { AppShell } from "@/components/layout/AppShell";
import { AiOperationsContent } from "@/components/ai-operations/AiOperationsContent";
import { loadAiOperationsData } from "@/lib/ai-operations/load-ai-operations";

export default async function AiOperationsPage() {
  const data = await loadAiOperationsData();

  return (
    <AppShell
      activeHref="/ai-operations"
      title="AI Operations Centre"
      subtitle="Development factory agent registry and workforce visibility"
      headerContext="AI Operations"
    >
      <AiOperationsContent data={data} />
    </AppShell>
  );
}
