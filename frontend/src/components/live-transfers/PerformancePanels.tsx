import { formatGbp } from "@/lib/live-transfers/demo-data";

type Point = { label: string; value: number };

export function PerformancePanels({
  hourly,
  conversionByAgent,
  outcomes,
  waitTrend,
  revenueTrend,
}: {
  hourly: Point[];
  conversionByAgent: Point[];
  outcomes: Point[];
  waitTrend: Point[];
  revenueTrend: Point[];
}) {
  return (
    <section aria-labelledby="performance-heading" className="space-y-6">
      <h2 id="performance-heading" className="text-lg font-bold text-slate-900">
        Performance panels
      </h2>
      <p className="text-sm text-slate-500">Demo charts — Not configured for live BI.</p>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Transfers by hour (demo)">
          <BarChart points={hourly} />
        </Panel>
        <Panel title="Conversion by agent (demo)">
          <BarChart points={conversionByAgent} color="bg-sky-500" />
        </Panel>
        <Panel title="Transfer outcomes (demo)">
          <BarChart points={outcomes} color="bg-violet-500" />
        </Panel>
        <Panel title="Average wait-time trend (demo)">
          <BarChart points={waitTrend} color="bg-amber-500" suffix="s" />
        </Panel>
        <Panel title="Demo estimated revenue trend">
          <BarChart points={revenueTrend} color="bg-emerald-500" formatGbp />
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarChart({
  points,
  color = "bg-emerald-500",
  suffix = "",
  formatGbp: useGbp = false,
}: {
  points: Point[];
  color?: string;
  suffix?: string;
  formatGbp?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <ul className="space-y-2">
      {points.map((point) => (
        <li key={point.label}>
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
            <span>{point.label}</span>
            <span>
              {useGbp ? formatGbp(point.value) : `${point.value}${suffix}`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${color}`}
              style={{ width: `${(point.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
