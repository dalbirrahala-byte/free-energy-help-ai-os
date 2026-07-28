import { AppShell } from "@/components/layout/AppShell";
import { MissionControlContent } from "@/components/dashboard/MissionControlContent";
import { loadMissionControlData } from "@/lib/dashboard/queries";

export default async function MissionControlPage() {
  const data = await loadMissionControlData();

  return (
    <AppShell
      activeHref="/"
      title="Mission Control"
      subtitle="Free Energy Help commercial energy command centre"
    >
      <MissionControlContent data={data} />
    </AppShell>
  );
}
