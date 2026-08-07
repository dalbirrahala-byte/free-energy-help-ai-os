import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { ExecutiveIntelligenceDashboard } from "@/components/executive-intelligence-dashboard";
import { loadExecutiveIntelligenceData } from "@/lib/executive-intelligence-dashboard/queries";

export const metadata: Metadata = {
  title: "Executive Intelligence Dashboard | Free Energy Help AI OS",
  description: "Executive summary of customers, renewals, pipeline, and risk",
};

export default async function ExecutiveIntelligenceDashboardPage() {
  const data = await loadExecutiveIntelligenceData();

  return (
    <AppShell
      activeHref="/executive-intelligence-dashboard"
      title="Executive Intelligence Dashboard"
      subtitle="Executive summary of customers, renewals, pipeline, and risk"
      headerContext="Executive Intelligence"
    >
      <ExecutiveIntelligenceDashboard data={data} />
    </AppShell>
  );
}
