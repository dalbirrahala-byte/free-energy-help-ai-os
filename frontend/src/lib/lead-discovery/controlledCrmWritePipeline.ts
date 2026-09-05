import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";
import {
  executeControlledCrmWrite,
  type ControlledCrmWriteExecutionResult,
} from "./executeControlledCrmWrite.ts";
import { createControlledCrmWriterAdapter } from "./controlledCrmWriterAdapter.ts";
import { createCrmWriteTransportBoundary } from "./crmWriteTransportBoundary.ts";
import {
  createControlledCrmPersistenceAdapter,
  type CrmWritePersistencePrimitive,
} from "./controlledCrmPersistenceAdapter.ts";

/**
 * Factory 044 Phase 14 composes Phases 10-13 into one provider-neutral,
 * fail-closed pipeline. The only capability is the injected primitive.
 *
 * This module contains no Supabase client, SQL, credentials, network route,
 * retry loop, outreach, or provider execution.
 */
export async function executeControlledCrmWritePipeline(
  primitive: CrmWritePersistencePrimitive,
  preparation: CrmWriteExecutionPreparation,
): Promise<ControlledCrmWriteExecutionResult> {
  const persistence = createControlledCrmPersistenceAdapter(primitive);
  const transport = createCrmWriteTransportBoundary(persistence);
  const writer = createControlledCrmWriterAdapter(transport);

  return executeControlledCrmWrite(writer, preparation);
}
