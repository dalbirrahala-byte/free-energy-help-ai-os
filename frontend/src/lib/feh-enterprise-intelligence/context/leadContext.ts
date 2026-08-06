import { hasText } from "../../shared/textUtils.ts";
import type { LeadContextInput } from "../types";
import type { NormalizedLeadContext } from "./contextTypes";

const TRACKED_FIELDS: Array<keyof LeadContextInput> = [
  "company_name",
  "contact_name",
  "telephone",
  "email",
  "supplier",
  "contract_end",
  "status",
];

/**
 * Builds a normalized lead context from data the caller supplies directly.
 * No Supabase query happens here or anywhere else in this module — Gate 5
 * only ever operates on context that's already been loaded by the caller.
 */
export function buildLeadContext(input: LeadContextInput): NormalizedLeadContext {
  const fieldsSupplied: string[] = [];
  const fieldsMissing: string[] = [];

  for (const field of TRACKED_FIELDS) {
    if (hasText(input[field])) {
      fieldsSupplied.push(field);
    } else {
      fieldsMissing.push(field);
    }
  }

  return {
    id: input.id ?? null,
    company_name: input.company_name,
    contact_name: input.contact_name,
    telephone: input.telephone,
    email: input.email,
    supplier: input.supplier,
    contract_end: input.contract_end,
    status: input.status,
    fieldsSupplied,
    fieldsMissing,
  };
}
