import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DrillDownDetail } from "@/lib/digital-twin/types";

export function DrillDownPanel({ detail }: { detail: DrillDownDetail | null }) {
  return (
    <SectionCard title="Interactive drill-down" description="Detail for selected entity (demo)">
      {!detail ? (
        <p className="text-sm text-slate-600">Select a site, graph node, risk row, renewal window, opportunity, or supplier card.</p>
      ) : (
        <>
          <h3 className="text-lg font-bold">{detail.title}</h3>
          <p className="text-sm text-slate-500">{detail.subtitle}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {detail.fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-semibold uppercase text-slate-400">{f.label}</dt>
                <dd className="text-sm">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.actions.map((a) => (
              <button key={a} type="button" disabled className="rounded-lg border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400">
                {a}
              </button>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
