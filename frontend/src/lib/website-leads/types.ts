import {
  RENEWAL_TIMING_OPTIONS,
  WEBSITE_LEAD_STATUSES,
} from "./constants";

export type RenewalTimingValue = (typeof RENEWAL_TIMING_OPTIONS)[number]["value"];

export type WebsiteLeadPriority = "Hot" | "Warm" | "Nurture";

export type WebsiteLeadStatus = (typeof WEBSITE_LEAD_STATUSES)[number];

export type WebsiteLeadNote = {
  id: string;
  body: string;
  createdAt: string;
  createdLabel: string;
};

export type WebsiteLead = {
  leadReference: string;
  businessName: string;
  contactName: string;
  telephone: string;
  email: string;
  postcode: string;
  renewalTiming: RenewalTimingValue;
  renewalTimingLabel: string;
  consentAt: string;
  createdAt: string;
  createdAtLabel: string;
  source: "Website";
  status: WebsiteLeadStatus;
  priority: WebsiteLeadPriority;
  recommendedNextAction: string;
  notes: WebsiteLeadNote[];
};

export type WebsiteLeadFormInput = {
  businessName: string;
  contactName: string;
  telephone: string;
  email: string;
  postcode: string;
  renewalTiming: RenewalTimingValue | "";
  consent: boolean;
};

export type WebsiteLeadFormErrors = Partial<
  Record<
    | "businessName"
    | "contactName"
    | "telephone"
    | "email"
    | "postcode"
    | "renewalTiming"
    | "consent"
    | "form",
    string
  >
>;
