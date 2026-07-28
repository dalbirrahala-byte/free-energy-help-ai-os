import { AppShell } from "@/components/layout/AppShell";
import { QuoteEngineDashboard } from "@/components/quotes/QuoteEngineDashboard";

export default function QuotesPage() {
  return (
    <AppShell
      activeHref="/quotes"
      title="Quote Engine"
      subtitle="Commercial energy quotes, supplier comparison, and pipeline"
      headerContext="Quotes"
    >
      <QuoteEngineDashboard />
    </AppShell>
  );
}
