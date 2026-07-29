import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DecisionExplanation, Recommendation } from "@/lib/decision-engine/types";

export function DecisionExplanationPanel({
  explanation,
  recommendation,
}: {
  explanation: DecisionExplanation;
  recommendation?: Recommendation;
}) {
  return (
    <SectionCard title="Decision explanation panel" description="Explainable scores — demo">
      {!recommendation && <p className="text-sm text-slate-600">Select a recommendation from the queue.</p>}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">Why created</dt>
          <dd className="text-sm">{explanation.whyCreated}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-400">Correlation ID</dt>
          <dd className="font-mono text-sm">{explanation.correlationId}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase text-slate-400">Rules triggered</dt>
          <dd className="text-sm">{explanation.rulesTriggered.join("; ")}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-bold">Scores calculated</h3>
        {explanation.scoresCalculated.map((s) => (
          <div key={s.explanation} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold">Score: {s.finalScore}</p>
            <p>{s.explanation}</p>
            <p className="text-xs text-slate-500">Confidence: {s.confidence}</p>
            {s.positiveFactors.length > 0 && <p className="text-xs text-emerald-700">+ {s.positiveFactors.join(", ")}</p>}
            {s.negativeFactors.length > 0 && <p className="text-xs text-rose-700">− {s.negativeFactors.join(", ")}</p>}
            {s.missingData.length > 0 && <p className="text-xs text-amber-700">Missing: {s.missingData.join(", ")}</p>}
          </div>
        ))}
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            ["Evidence used", explanation.evidenceUsed.join(", ") || "—"],
            ["Missing information", explanation.missingInformation.join(", ") || "—"],
            ["Confidence reason", explanation.confidenceReason],
            ["Business impact", explanation.estimatedBusinessImpact],
            ["Alternatives", explanation.alternativeActions.join(", ")],
            ["Approval", explanation.approvalRequired ? "Required (demo)" : "Not required"],
            ["Source modules", explanation.sourceModules.join(", ")],
            ["Timestamp", explanation.decisionTimestamp],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
