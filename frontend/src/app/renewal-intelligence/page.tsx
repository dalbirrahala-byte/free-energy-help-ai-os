import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { RenewalIntelligenceDashboard } from "@/components/renewal-intelligence/RenewalIntelligenceDashboard";
import { loadRenewalIntelligenceData } from "@/lib/renewal-intelligence/queries";

export const metadata: Metadata = {
  title: "Renewal Intelligence | Free Energy Help AI OS",
  description: "Live contract renewal pipeline across every customer site",
};

export default async function RenewalIntelligencePage() {
  const data = await loadRenewalIntelligenceData();

  return (
    <AppShell
      activeHref="/renewal-intelligence"
      title="Renewal Intelligence"
      subtitle="Live contract renewal pipeline across every customer site"
      headerContext="Renewal Intelligence"
    >
      <RenewalIntelligenceDashboard data={data} />
    </AppShell>
  );
}
