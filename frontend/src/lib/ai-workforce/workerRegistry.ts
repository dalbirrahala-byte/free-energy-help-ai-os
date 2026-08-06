import { commercialEnergyIntelligenceWorker } from "./workers/commercialEnergyIntelligenceWorker.ts";
import { complianceWorker } from "./workers/complianceWorker.ts";
import { customerSuccessWorker } from "./workers/customerSuccessWorker.ts";
import { executiveReportingWorker } from "./workers/executiveReportingWorker.ts";
import { marketingDirectorWorker } from "./workers/marketingDirectorWorker.ts";
import { renewalIntelligenceWorker } from "./workers/renewalIntelligenceWorker.ts";
import { salesDirectorWorker } from "./workers/salesDirectorWorker.ts";
import { voiceAiWorker } from "./workers/voiceAiWorker.ts";

import type { Worker, WorkerDescriptor, WorkerId } from "./types";

/**
 * Every AI worker in the FEH AI Business Operating System, registered here.
 * Only registered workers are invokable by the orchestrator — requesting an
 * unregistered ID is a typed safe failure, never a crash or silent no-op.
 */
export const WORKER_REGISTRY: Record<WorkerId, Worker> = {
  commercialEnergyIntelligence: commercialEnergyIntelligenceWorker,
  renewalIntelligence: renewalIntelligenceWorker,
  salesDirector: salesDirectorWorker,
  marketingDirector: marketingDirectorWorker,
  customerSuccess: customerSuccessWorker,
  compliance: complianceWorker,
  voice: voiceAiWorker,
  executiveReporting: executiveReportingWorker,
};

export function getWorker(id: WorkerId): Worker | undefined {
  return WORKER_REGISTRY[id];
}

export function listWorkerDescriptors(): WorkerDescriptor[] {
  return Object.values(WORKER_REGISTRY).map((worker) => worker.describe());
}
