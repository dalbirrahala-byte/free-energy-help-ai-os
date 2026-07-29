import { SectionCard } from "@/components/dashboard/SectionCard";
import { DEMO_EXECUTIVE_LABEL } from "@/lib/decision-engine/constants";

export function DirectorBriefingPanel({
  data,
}: {
  data: {
    opportunities: string[];
    risks: string[];
    sections: { title: string; items: string[] }[];
    priorities: string[];
  };
}) {
  return (
    <SectionCard title="Director decision briefing" description={DEMO_EXECUTIVE_LABEL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="font-bold">Top five opportunities</h3>
          <ol className="mt-2 list-decimal pl-5 text-sm">{data.opportunities.slice(0, 5).map((o) => <li key={o}>{o}</li>)}</ol>
        </div>
        <div>
          <h3 className="font-bold">Top five risks</h3>
          <ol className="mt-2 list-decimal pl-5 text-sm">{data.risks.slice(0, 5).map((r) => <li key={r}>{r}</li>)}</ol>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.sections.map((s) => (
          <div key={s.title} className="rounded-lg border border-slate-100 p-3 text-sm">
            <h4 className="font-semibold">{s.title}</h4>
            <ul className="mt-1 list-disc pl-5">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-bold">Recommended priorities for today</h3>
        <ul className="mt-2 list-disc pl-5 text-sm">{data.priorities.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
    </SectionCard>
  );
}
