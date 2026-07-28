import { DEMO_DATA_LABEL } from "./constants";
import type { WorkflowHealthSummary } from "./types";

export function buildWorkflowHealthSummary(): WorkflowHealthSummary {
  return {
    activeDemoWorkflows: `7 ${DEMO_DATA_LABEL}`,
    eventsToday: `42 ${DEMO_DATA_LABEL}`,
    awaitingApproval: `6 ${DEMO_DATA_LABEL}`,
    failedEvents: `2 ${DEMO_DATA_LABEL}`,
    journeysInProgress: `5 ${DEMO_DATA_LABEL}`,
    automationReadiness: `68% architecture ready (${DEMO_DATA_LABEL})`,
    aiAwaitingReview: `4 ${DEMO_DATA_LABEL}`,
    dataQualityBlockers: `9 ${DEMO_DATA_LABEL}`,
    demoTimeSaved: `~14.5 hrs/week (${DEMO_DATA_LABEL})`,
  };
}
