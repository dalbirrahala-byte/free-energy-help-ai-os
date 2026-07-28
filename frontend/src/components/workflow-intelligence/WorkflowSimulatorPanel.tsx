"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { SimulationResult, SimulationScenarioId } from "@/lib/workflows/types";

export function WorkflowSimulatorPanel({
  scenarios,
  selected,
  onSelect,
  result,
}: {
  scenarios: { id: SimulationScenarioId; label: string }[];
  selected: SimulationScenarioId;
  onSelect: (id: SimulationScenarioId) => void;
  result: SimulationResult;
}) {
  return (
    <SectionCard title="Workflow simulator" description="UI-only — no record changes">
      <label className="block max-w-md">
        <span className="text-xs font-semibold uppercase text-slate-500">Scenario</span>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value as SimulationScenarioId)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-semibold">Input event</p>
          <p className="mt-1">{result.inputEvent}</p>
          <p className="mt-3 font-semibold">Rules evaluated</p>
          <ul className="list-disc pl-5">{result.rulesEvaluated.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 font-semibold">Conditions passed</p>
          <ul className="list-disc pl-5">{result.conditionsPassed.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-semibold">Actions proposed</p>
          <ul className="list-disc pl-5">{result.actionsProposed.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className="mt-3 font-semibold">Approval required</p>
          <p>{result.approvalRequired.length ? result.approvalRequired.join(", ") : "None (demo)"}</p>
          <p className="mt-3 font-semibold">Expected result</p>
          <p>{result.expectedResult}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold">Demonstration timeline</p>
        <ol className="mt-2 space-y-2">
          {result.timeline.map((step) => (
            <li key={step.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-slate-500">{step.label}</span> — {step.detail}
            </li>
          ))}
        </ol>
      </div>
    </SectionCard>
  );
}
