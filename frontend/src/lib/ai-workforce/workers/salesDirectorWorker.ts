import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "Sales Intelligence Engine is design-only (see docs/SALES_INTELLIGENCE_ENGINE.md). None of these capabilities have the real historical outcome data (win/loss, response-time, deal-size history) they'd need to calculate from — none has been fabricated.";

const DESCRIPTOR: WorkerDescriptor = {
  id: "salesDirector",
  name: "Sales Director AI",
  responsibility: "Coordinates sales prioritisation and next-best-action guidance across the pipeline.",
  capabilities: [
    { id: "nextBestCustomer", label: "Next best customer", description: "Which lead/customer to prioritise next.", implemented: false },
    { id: "nextBestAction", label: "Next best action", description: "The single highest-value action across the pipeline.", implemented: false },
    { id: "probabilityToClose", label: "Probability to close", description: "Likelihood a deal closes, from real historical outcomes.", implemented: false },
    { id: "callTimingOptimisation", label: "Call timing optimisation", description: "Best time to contact a lead, from real historical response data.", implemented: false },
    { id: "opportunityPrioritisation", label: "Opportunity prioritisation", description: "Ranks open opportunities by real signals.", implemented: false },
    { id: "crossSellRecommendation", label: "Cross-sell recommendations", description: "Additional products/services a customer may genuinely need.", implemented: false },
  ],
  status: "not_yet_configured",
};

export const salesDirectorWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("salesDirector", REASON, input.today ?? new Date());
  },
};
