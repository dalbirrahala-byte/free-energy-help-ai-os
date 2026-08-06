import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "No consent, suppression, or call-recording-compliance data source exists anywhere in this project yet — the design for one exists in docs/VOICE_ARCHITECTURE.md but nothing has been built. This mirrors the Gate 5 complianceEvaluation capability, which is also always \"not_configured\" for the same reason.";

const DESCRIPTOR: WorkerDescriptor = {
  id: "compliance",
  name: "Compliance AI",
  responsibility: "Evaluates consent, suppression, and regulatory compliance status.",
  capabilities: [
    { id: "consentTracking", label: "Consent tracking", description: "Requires a real consent_records data source.", implemented: false },
    { id: "suppressionEnforcement", label: "Suppression list enforcement", description: "Requires a real suppression_records data source.", implemented: false },
    { id: "recordingCompliance", label: "Recording/transcription compliance", description: "Requires real call/transcript data, which requires Voice AI first.", implemented: false },
  ],
  status: "not_yet_configured",
};

export const complianceWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("compliance", REASON, input.today ?? new Date());
  },
};
