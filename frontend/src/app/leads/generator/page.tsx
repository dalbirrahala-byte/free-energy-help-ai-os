import Link from "next/link";

import { FACTORY_044_SIGNAL_FAMILIES, buildDiscoveryQueries } from "@/lib/lead-discovery/factory044Discovery";
import { apolloDiscoveryAdapter } from "@/lib/lead-discovery/discoveryAdapters";

const previewQueries = buildDiscoveryQueries({
  sector: "manufacturing",
  locations: ["Derby", "Burton upon Trent"],
  signalFamilies: ["BUSINESS_CHANGE", "PROPERTY_DEVELOPMENT", "ENERGY_DEMAND"],
});

export default function LeadGeneratorPage() {
  const apollo = apolloDiscoveryAdapter.plan({ locations: [], signalFamilies: [] });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Factory 044</p>
          <h1 className="text-3xl font-semibold">FEH Lead Intelligence Generator</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Discover evidence first, score the opportunity, then require human review before anything can become a CRM lead.
          </p>
        </div>
        <Link href="/leads" className="rounded-md border px-4 py-2 text-sm font-medium">← Back to Leads</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">Public web</p><p className="mt-1 font-semibold">Ready for controlled discovery</p><p className="mt-2 text-sm text-slate-600">Planning only in this phase. No automatic crawling.</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">Apollo</p><p className="mt-1 font-semibold">{apollo.status}</p><p className="mt-2 text-sm text-slate-600">{apollo.reason}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs uppercase text-slate-500">CRM promotion</p><p className="mt-1 font-semibold">Human review required</p><p className="mt-2 text-sm text-slate-600">Discovery never grants outreach permission.</p></div>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Discovery controls</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">Sector<input readOnly value="manufacturing" className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          <label className="text-sm">Location<input readOnly value="Derby · Burton upon Trent" className="mt-1 w-full rounded-md border px-3 py-2" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{FACTORY_044_SIGNAL_FAMILIES.map((family) => <span key={family} className="rounded-full border px-3 py-1 text-xs">{family.replaceAll("_", " ")}</span>)}</div>
      </section>

      <section className="rounded-lg border p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Prepared search techniques</h2><span className="text-xs text-slate-500">No network execution</span></div>
        <div className="mt-4 space-y-2">{previewQueries.slice(0, 9).map((item) => <div key={`${item.signalFamily}:${item.query}`} className="rounded-md bg-slate-50 p-3"><p className="font-mono text-sm">{item.query}</p><p className="mt-1 text-xs text-slate-500">{item.signalFamily} · {item.technique}</p></div>)}</div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold">Promotion boundary</h2>
        <p className="mt-2 text-sm">A future Promote to Lead control will remain disabled until evidence has been reviewed. Phase 2 performs no CRM write and no outreach.</p>
      </section>
    </main>
  );
}
