import type { NormalizedCustomerContext, NormalizedLeadContext } from "../context/contextTypes";
import type { ActivityContextInput, CapabilityId, CapabilityOutcome, TaskContextInput } from "../types";

export type CapabilityExecutionInput = {
  lead: NormalizedLeadContext;
  customer: NormalizedCustomerContext;
  activities: ActivityContextInput[];
  tasks: TaskContextInput[];
  today: Date;
};

export type Capability = {
  id: CapabilityId;
  execute: (input: CapabilityExecutionInput) => CapabilityOutcome;
};
