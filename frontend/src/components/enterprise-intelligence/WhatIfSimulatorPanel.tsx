"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WhatIfInputs, WhatIfResult } from "@/lib/decision-engine/types";

const FIELDS: { key: keyof WhatIfInputs; label: string }[] = [
  { key: "contractEndDays", label: "Contract end (days)" },
  { key: "annualConsumption", label: "Annual consumption (kWh)" },
  { key: "customerValue", label: "Customer value (£)" },
  { key: "daysSinceContact", label: "Days since last contact" },
  { key: "quoteValue", label: "Quote value (£)" },
  { key: "quoteAge", label: "Quote age (days)" },
  { key: "outstandingCommission", label: "Outstanding commission (£)" },
  { key: "supplierPaymentDelay", label: "Supplier payment delay (days)" },
  { key: "renewalProbability", label: "Renewal probability (%)" },
  { key: "accountManagerWorkload", label: "Account-manager workload (tasks)" },
  { key: "dataCompleteness", label: "Data completeness (%)" },
];

export function WhatIfSimulatorPanel({
  inputs,
  onChange,
  result,
}: {
  inputs: WhatIfInputs;
  onChange: (v: WhatIfInputs) => void;
  result: WhatIfResult;
}) {
  return (
    <SectionCard title="What-if simulator" description="UI-only — no record changes">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
              <input
                type="number"
                value={inputs[key]}
                onChange={(e) => onChange({ ...inputs, [key]: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p>
            Previous score: <strong>{result.previousScore}</strong> → New score: <strong>{result.newScore}</strong>
          </p>
          <p className="mt-2 font-semibold">Changed factors</p>
          <ul className="list-disc pl-5">{result.changedFactors.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="mt-3">New recommendation: {result.newRecommendation}</p>
          <p>Priority: {result.newPriority} · Confidence: {result.newConfidence}</p>
          <p>Impact: {result.estimatedDemoRevenueImpact}</p>
          <p>Approval: {result.approvalRequired ? "Required (demo)" : "Not required"}</p>
        </div>
      </div>
    </SectionCard>
  );
}
