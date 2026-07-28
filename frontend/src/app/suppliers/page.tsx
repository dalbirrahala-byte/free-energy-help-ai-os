import { AppShell } from "@/components/layout/AppShell";
import { SupplierIntelligenceDashboard } from "@/components/suppliers/SupplierIntelligenceDashboard";

export default function SuppliersPage() {
  return (
    <AppShell
      activeHref="/suppliers"
      title="Supplier Intelligence"
      subtitle="Scorecards, performance comparison, and commission insights (demo)"
      headerContext="Suppliers"
    >
      <SupplierIntelligenceDashboard />
    </AppShell>
  );
}
