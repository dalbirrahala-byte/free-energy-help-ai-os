import type { CustomerContextInput } from "../types";
import type { NormalizedCustomerContext } from "./contextTypes";

/** Customer context is optional — a lead that hasn't converted supplies none, and that's a valid, honest state, not an error. */
export function buildCustomerContext(input: CustomerContextInput | null | undefined): NormalizedCustomerContext {
  if (!input) {
    return { supplied: false, id: null, company_name: null, status: null };
  }

  return {
    supplied: true,
    id: input.id ?? null,
    company_name: input.company_name,
    status: input.status,
  };
}
