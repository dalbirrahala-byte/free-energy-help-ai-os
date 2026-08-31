import { RENEWAL_TIMING_OPTIONS } from "./constants.ts";
import type { RenewalTimingValue } from "./types.ts";

export function renewalTimingLabel(value: RenewalTimingValue): string {
  return RENEWAL_TIMING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatLeadDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

import { LEAD_REFERENCE_YEAR } from "./constants.ts";

export function formatLeadReference(sequence: number): string {
  return `LEAD-${LEAD_REFERENCE_YEAR}-${String(sequence).padStart(4, "0")}`;
}
