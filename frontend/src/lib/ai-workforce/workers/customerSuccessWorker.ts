import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "No customer satisfaction survey data or churn-outcome history exists anywhere in this schema. Basic engagement/health signals already exist and are served honestly by the Commercial Energy Intelligence AI worker — this worker is reserved for the additional signals (satisfaction, churn prediction) that genuinely need data this project doesn't have yet.";

const DESCRIPTOR: WorkerDescriptor = {
  id: "customerSuccess",
  name: "Customer Success AI",
  responsibility: "Monitors customer satisfaction and churn risk to support retention.",
  capabilities: [
    { id: "churnRisk", label: "Churn risk", description: "Requires real historical churn outcomes to calculate from.", implemented: false },
    { id: "satisfactionSignal", label: "Satisfaction signal", description: "Requires a real satisfaction data source (survey, NPS, etc).", implemented: false },
  ],
  status: "not_yet_configured",
};

export const customerSuccessWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("customerSuccess", REASON, input.today ?? new Date());
  },
};
