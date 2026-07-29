import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { DigitalTwinDashboard } from "@/components/digital-twin/DigitalTwinDashboard";

export const metadata: Metadata = {
  title: "Enterprise Commercial Digital Twin | Free Energy Help AI OS",
  description: "Operational brain of the brokerage — demonstration workspace",
};

export default function DigitalTwinPage() {
  return (
    <AppShell
      activeHref="/digital-twin"
      title="Enterprise Commercial Digital Twin"
      subtitle="Portfolio and customer commercial workspace — demonstration architecture"
      headerContext="Commercial Digital Twin"
    >
      <DigitalTwinDashboard />
    </AppShell>
  );
}
