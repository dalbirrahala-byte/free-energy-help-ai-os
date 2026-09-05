import type {
  CrmWritePersistenceCommand,
  CrmWritePersistencePort,
  CrmWritePersistenceResult,
} from "./crmWriteTransportBoundary.ts";

export type CrmWritePersistencePrimitive = Readonly<{
  createLeadOnce(
    command: CrmWritePersistenceCommand,
  ): Promise<CrmWritePersistenceResult>;
}>;

/**
 * Factory 044 Phase 13 adds the final provider-neutral persistence adapter.
 *
 * It deliberately does not contain a Supabase client, SQL, credentials,
 * migrations, retry logic, outreach, or provider execution. A separately
 * governed server-side layer must inject the primitive.
 */
export function createControlledCrmPersistenceAdapter(
  primitive: CrmWritePersistencePrimitive,
): CrmWritePersistencePort {
  return {
    async persistOnce(
      command: CrmWritePersistenceCommand,
    ): Promise<CrmWritePersistenceResult> {
      if (
        command.operation !== "create_lead_once" ||
        !command.organisationName.trim() ||
        !command.idempotencyKey.trim() ||
        !command.audit.reviewerReference.trim() ||
        !command.audit.authorizationReference.trim() ||
        !Number.isFinite(command.opportunityScore)
      ) {
        return {
          status: "blocked",
          reason: "Controlled CRM persistence adapter prerequisites are incomplete or invalid.",
        };
      }

      try {
        const result = await primitive.createLeadOnce(command);

        if (result.status === "created" || result.status === "duplicate") {
          return result.recordReference.trim()
            ? result
            : {
                status: "indeterminate",
                reason: "Persistence primitive returned a record outcome without a record reference.",
              };
        }

        return result;
      } catch {
        return {
          status: "indeterminate",
          reason: "Persistence primitive threw during the single controlled write attempt; do not automatically retry.",
        };
      }
    },
  };
}
