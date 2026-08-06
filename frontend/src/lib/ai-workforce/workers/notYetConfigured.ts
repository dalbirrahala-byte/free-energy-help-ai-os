import type { ConfidenceResult, WorkerId, WorkerResult } from "../types";

const ZERO_CONFIDENCE: ConfidenceResult = {
  level: "Insufficient",
  explanation: "No evidence items were evaluated — this worker is not yet configured.",
  evidenceAvailable: 0,
  evidenceTotal: 0,
};

/** Shared result shape for every worker that has no real data source yet — never a fabricated summary. */
export function notYetConfiguredResult(workerId: WorkerId, reason: string, calculatedAt: Date): WorkerResult {
  return {
    workerId,
    status: "not_yet_configured",
    summary: "Not Yet Configured",
    data: null,
    confidence: ZERO_CONFIDENCE,
    explanation: reason,
    reasonNotConfigured: reason,
    calculatedAt: calculatedAt.toISOString(),
  };
}
