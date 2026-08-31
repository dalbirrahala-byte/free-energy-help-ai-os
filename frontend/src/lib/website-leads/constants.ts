export const WEBSITE_LEADS_STORAGE_KEY = "feh-website-leads-v1";
export const WEBSITE_LEADS_SEQUENCE_KEY = "feh-website-leads-sequence-v1";

export const LEAD_REFERENCE_YEAR = 2026;

export const RENEWAL_TIMING_OPTIONS = [
  { value: "within_30_days", label: "Within 30 days" },
  { value: "31_90_days", label: "31–90 days" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "6_12_months", label: "6–12 months" },
  { value: "more_than_12_months", label: "More than 12 months" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const ENERGY_SUPPLY_OPTIONS = [
  { value: "electricity", label: "Electricity" },
  { value: "gas", label: "Gas" },
  { value: "both", label: "Electricity and gas" },
] as const;

export const WEBSITE_LEAD_STATUSES = [
  "New",
  "Attempted Contact",
  "Contacted",
  "Qualified",
  "Appointment Booked",
  "Quote Requested",
  "Won",
  "Lost",
] as const;

export const WEBSITE_LEADS_CHANGED_EVENT = "feh-website-leads-changed";

export const PRIORITY_FILTER_OPTIONS = ["All", "Hot", "Warm", "Nurture"] as const;

export type PriorityFilter = (typeof PRIORITY_FILTER_OPTIONS)[number];
