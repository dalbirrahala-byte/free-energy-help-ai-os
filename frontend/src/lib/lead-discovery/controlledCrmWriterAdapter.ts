import type {
  ControlledCrmWriter,
  ControlledCrmWriteOutcome,
} from "./executeControlledCrmWrite.ts";
import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";

export type ControlledCrmWriteRequest = Readonly<{
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  idempotencyKey: string;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
}>;

export type ControlledCrmWriteTransportResult =
  | Readonly<{ status: "created"; crmRecordReference: string }>
  | Readonly<{ status: "duplicate"; crmRecordReference: string }>
  | Readonly<{ status: "blocked"; reason?: string }>
  | Readonly<{ status: "indeterminate"; reason?: string }>;

export type ControlledCrmWriteTransport = Readonly<{
  writeOnce(request: ControlledCrmWriteRequest): Promise<ControlledCrmWriteTransportResult>;
}>;

/**
 * Provider-neutral Phase 11 adapter.
 *
 * It has no Supabase client, credentials, route, network transport, retry loop,
 * outreach capability, or provider-execution capability. A separately governed
 * server-side layer may inject a transport only after its own review.
 */
export function createControlledCrmWriterAdapter(
  transport: ControlledCrmWriteTransport,
): ControlledCrmWriter {
  return {
    async writePreparedCandidate(
      preparation: CrmWriteExecutionPreparation,
    ): Promise<ControlledCrmWriteOutcome> {
      const organisationName = preparation.organisationName.trim();
      const reviewerReference = preparation.reviewerReference.trim();
      const authorizationReference = preparation.authorizationReference.trim();
      const idempotencyKey = preparation.idempotencyKey.trim();

      if (
        preparation.status !== "PREPARED_FOR_CONTROLLED_EXECUTION" ||
        preparation.crmWriteAllowed !== true ||
        preparation.crmWritePerformed !== false ||
        preparation.outreachAllowed !== false ||
        preparation.executionPerformed !== false ||
        !organisationName ||
        !reviewerReference ||
        !authorizationReference ||
        !idempotencyKey
      ) {
        return {
          status: "blocked",
          reason: "Controlled CRM writer adapter prerequisites are incomplete or inconsistent.",
        };
      }

      const result = await transport.writeOnce({
        organisationName,
        reviewerReference,
        authorizationReference,
        idempotencyKey,
        opportunityScore: preparation.opportunityScore,
        opportunityClassification: preparation.opportunityClassification,
        nextBestAction: preparation.nextBestAction,
      });

      if (result.status === "created") {
        const crmRecordReference = result.crmRecordReference.trim();
        return crmRecordReference
          ? { status: "written", crmRecordReference }
          : { status: "indeterminate", reason: "CRM transport reported creation without a record reference." };
      }

      if (result.status === "duplicate") {
        const crmRecordReference = result.crmRecordReference.trim();
        return crmRecordReference
          ? { status: "duplicate_suppressed", crmRecordReference }
          : { status: "indeterminate", reason: "CRM transport reported a duplicate without an existing record reference." };
      }

      return result;
    },
  };
}
