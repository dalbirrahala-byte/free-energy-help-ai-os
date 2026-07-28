import { AppShell } from "@/components/layout/AppShell";
import { LiveTransferDashboard } from "@/components/live-transfers/LiveTransferDashboard";

export default function LiveTransfersPage() {
  return (
    <AppShell
      activeHref="/live-transfers"
      title="Live Transfer Command Centre"
      subtitle="Inbound commercial energy transfers — demonstration queue"
      headerContext="Live transfers"
    >
      <LiveTransferDashboard />
    </AppShell>
  );
}
