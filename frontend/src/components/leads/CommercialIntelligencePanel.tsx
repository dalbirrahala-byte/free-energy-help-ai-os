import { SectionCard } from "@/components/dashboard/SectionCard";
import type { CommercialIntelligenceViewModel } from "@/lib/commercial-intelligence/viewModel";
import type { CapabilityId, CapabilityOutcome, ConfidenceLevel } from "@/lib/feh-enterprise-intelligence/types";

const CAPABILITY_LABELS: Record<CapabilityId, string> = {
  renewalIntelligence: "Renewal Intelligence",
  leadIntelligence: "Lead Intelligence",
  customerHealth: "Customer Health",
  workflowRecommendation: "Recommended Action",
  opportunityIntelligence: "Commercial Opportunity",
  complianceEvaluation: "Compliance Evaluation",
};

const STATUS_LABELS: Record<CapabilityOutcome["status"], string> = {
  ok: "OK",
  insufficient_data: "Insufficient Data",
  not_configured: "Not Yet Configured",
  pending_approval: "Pending Approval",
  unavailable: "Unavailable",
  error: "Error",
};

const STATUS_STYLES: Record<CapabilityOutcome["status"], string> = {
  ok: "bg-emerald-100 text-emerald-800",
  insufficient_data: "bg-amber-100 text-amber-900",
  not_configured: "bg-slate-200 text-slate-700",
  pending_approval: "bg-blue-100 text-blue-800",
  unavailable: "bg-slate-200 text-slate-700",
  error: "bg-red-100 text-red-800",
};

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  High: "bg-emerald-100 text-emerald-800",
  Medium: "bg-amber-100 text-amber-900",
  Low: "bg-orange-100 text-orange-800",
  Insufficient: "bg-slate-200 text-slate-700",
};

function CapabilityTile({ outcome }: { outcome: CapabilityOutcome }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{CAPABILITY_LABELS[outcome.capabilityId]}</p>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[outcome.status]}`}>
          {STATUS_LABELS[outcome.status]}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-900">{outcome.recommendation}</p>
      <p className="mt-1 text-xs text-slate-500">{outcome.explanation}</p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_STYLES[outcome.confidence.level]}`}
        >
          Confidence: {outcome.confidence.level}
        </span>
        <span className="text-[11px] text-slate-400">{outcome.confidence.explanation}</span>
      </div>

      {outcome.missingData.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">Missing: {outcome.missingData.join(", ")}</p>
      )}
    </div>
  );
}

function AiWorkforceReadiness({ viewModel }: { viewModel: CommercialIntelligenceViewModel }) {
  const label = viewModel.aiWorkforceEnabled
    ? viewModel.aiWorkforceShadowMode
      ? "Enabled (shadow mode)"
      : "Enabled"
    : "Not Yet Configured";

  const style = viewModel.aiWorkforceEnabled
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-200 text-slate-700";

  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-medium text-slate-500">AI Workforce Orchestrator</p>
        <p className="mt-1 text-xs text-slate-400">
          Readiness status only — this panel does not invoke the orchestrator, since its real workers already wrap
          the results shown above.
        </p>
      </div>
      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{label}</span>
    </div>
  );
}

type CommercialIntelligencePanelProps = {
  viewModel: CommercialIntelligenceViewModel;
};

/**
 * Only ever rendered by the caller when `viewModel.visible` is true — see
 * lib/commercial-intelligence/viewModel.ts for the full visibility rules
 * (engine disabled, shadow mode, or an engine failure all resolve to
 * `visible: false`, leaving this component unrendered and the existing
 * Commercial Energy Intelligence / Renewal Intelligence cards untouched).
 */
export function CommercialIntelligencePanel({ viewModel }: CommercialIntelligencePanelProps) {
  if (!viewModel.response) {
    return null;
  }

  const outcomes = Object.values(viewModel.response.capabilityResults) as CapabilityOutcome[];

  return (
    <SectionCard
      title="Enterprise Intelligence"
      description="Evidence-based recommendations from the FEH Enterprise Intelligence Engine, shadow-validated against the cards above before ever being shown."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {outcomes.map((outcome) => (
          <CapabilityTile key={outcome.capabilityId} outcome={outcome} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-500">Overall Recommendation</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{viewModel.response.decision.recommendation}</p>
        <p className="mt-1 text-xs text-slate-500">{viewModel.response.decision.explanation}</p>
      </div>

      <AiWorkforceReadiness viewModel={viewModel} />
    </SectionCard>
  );
}
