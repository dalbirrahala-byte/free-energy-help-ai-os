import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EnterpriseIntelligenceDashboard } from "@/components/enterprise-intelligence";

export const metadata: Metadata = {
  title: "Enterprise Intelligence | Free Energy Help AI OS",
  description: "Central decision engine and prioritised recommendations (demonstration)",
};

export default function EnterpriseIntelligencePage() {
  return (
    <AppShell
      activeHref="/enterprise-intelligence"
      title="Enterprise Intelligence"
      subtitle="Central decision engine, scoring, and prioritised recommendations (demonstration)"
      headerContext="Enterprise Intelligence"
    >
      <EnterpriseIntelligenceDashboard />
    </AppShell>
  );
}
