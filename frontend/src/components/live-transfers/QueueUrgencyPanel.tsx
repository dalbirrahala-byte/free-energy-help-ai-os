import type { UrgencyGroup } from "@/lib/live-transfers/types";

const HEAT: Record<UrgencyGroup["heat"], string> = {
  green: "border-emerald-300 bg-emerald-50",
  amber: "border-amber-300 bg-amber-50",
  red: "border-red-300 bg-red-50",
};

export function QueueUrgencyPanel({ groups }: { groups: UrgencyGroup[] }) {
  return (
    <section
      aria-labelledby="queue-urgency-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="queue-urgency-heading" className="text-lg font-bold text-slate-900">
        Queue urgency
      </h2>
      <p className="mt-1 text-sm text-slate-500">Demo grouping for waiting / calling transfers.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <li
            key={group.bucket}
            className={`rounded-xl border p-4 ${HEAT[group.heat]}`}
          >
            <p className="text-xs font-bold uppercase text-slate-600">{group.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{group.count}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
