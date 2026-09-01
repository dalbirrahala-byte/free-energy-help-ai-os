import Link from "next/link";

import { apolloDiscoveryAdapter } from "@/lib/lead-discovery/discoveryAdapters";
import { LeadIntelligenceWorkbench } from "@/lib/lead-discovery/LeadIntelligenceWorkbench";

export default function LeadGeneratorPage() {
  const apollo = apolloDiscoveryAdapter.plan({ locations: [], signalFamilies: [] });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Factory 044 · Phase 3</p>
          <h1 className="text-3xl font-semibold">FEH Intelligence Engine</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            One controlled intelligence layer for public-web signals now and future Apollo, LinkedIn, Meta/Facebook and WhatsApp adapters.
          </p>
        </div>
        <Link href="/leads" className="rounded-md border px-4 py-2 text-sm font-medium">← Back to Leads</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">Public web</p><p className="mt-1 font-semibold">Controlled planning + reviewed evidence</p><p className="mt-2 text-sm text-slate-600">No automatic crawling. Evidence must be reviewed before scoring.</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">Apollo</p><p className="mt-1 font-semibold">{apollo.status}</p><p className="mt-2 text-sm text-slate-600">{apollo.reason}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">Future channel adapters</p><p className="mt-1 font-semibold">LinkedIn · Meta · WhatsApp</p><p className="mt-2 text-sm text-slate-600">Adapters will feed the same intelligence and compliance gates rather than bypassing them.</p></div>
      </section>

      <LeadIntelligenceWorkbench />
    </main>
  );
}
