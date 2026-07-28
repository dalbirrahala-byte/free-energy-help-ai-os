import { AppShell } from "@/components/layout/AppShell";
import { ContractCentreDashboard } from "@/components/contracts/ContractCentreDashboard";

export default function ContractsPage() {
  return (
    <AppShell
      activeHref="/contracts"
      title="Contract Centre"
      subtitle="Register, renewals timeline, and contract detail (demo)"
      headerContext="Contracts"
    >
      <ContractCentreDashboard />
    </AppShell>
  );
}
