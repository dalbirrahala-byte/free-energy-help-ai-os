import type {
  ControlledCrmWriteRequest,
  ControlledCrmWriteTransport,
  ControlledCrmWriteTransportResult,
} from "./controlledCrmWriterAdapter.ts";

export type CrmWritePersistenceCommand = Readonly<{
  operation: "create_lead_once";
  organisationName: string;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
  idempotencyKey: string;
  audit: Readonly<{
    reviewerReference: string;
    authorizationReference: string;
  }>;
}>;

export type CrmWritePersistenceResult =
  | Readonly<{ status: "created"; recordReference: string }>
  | Readonly<{ status: "duplicate"; recordReference: string }>
  | Readonly<{ status: "blocked"; reason?: string }>
  | Readonly<{ status: "indeterminate"; reason?: string }>;

export type CrmWritePersistencePort = Readonly<{
  persistOnce(command: CrmWritePersistenceCommand): Promise<CrmWritePersistenceResult>;
}>;

/**
 * Phase 12 translates the provider-neutral Phase 11 request into a narrowly
 * scoped persistence command. This is still only a boundary: there is no
 * Supabase client, credential, SQL, route, migration, retry loop, outreach, or
 * provider execution implementation here.
 */
export function createCrmWriteTransportBoundary(
  persistence: CrmWritePersistencePort,
): ControlledCrmWriteTransport {
  return {
    async writeOnce(
      request: ControlledCrmWriteRequest,
    ): Promise<ControlledCrmWriteTransportResult> {
      const organisationName = request.organisationName.trim();
      const reviewerReference = request.reviewerReference.trim();
      const authorizationReference = request.authorizationReference.trim();
      const idempotencyKey = request.idempotencyKey.trim();

      if (
        !organisationName ||
        !reviewerReference ||
        !authorizationReference ||
        !idempotencyKey ||
        !Number.isFinite(request.opportunityScore)
      ) {
        return {
          status: "blocked",
          reason: "CRM persistence boundary prerequisites are incomplete or invalid.",
        };
      }

      const result = await persistence.persistOnce({
        operation: "create_lead_once",
        organisationName,
        opportunityScore: request.opportunityScore,
        opportunityClassification: request.opportunityClassification,
        nextBestAction: request.nextBestAction,
        idempotencyKey,
        audit: {
          reviewerReference,
          authorizationReference,
        },
      });

      if (result.status === "created") {
        const crmRecordReference = result.recordReference.trim();
        return crmRecordReference
          ? { status: "created", crmRecordReference }
          : {
              status: "indeterminate",
              reason: "Persistence reported creation without a record reference.",
            };
      }

      if (result.status === "duplicate") {
        const crmRecordReference = result.recordReference.trim();
        return crmRecordReference
          ? { status: "duplicate", crmRecordReference }
          : {
              status: "indeterminate",
              reason: "Persistence reported duplicate suppression without a record reference.",
            };
      }

      return result;
    },
  };
}
