export type NormalizedLeadContext = {
  id: number | null;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  fieldsSupplied: string[];
  fieldsMissing: string[];
};

export type NormalizedCustomerContext = {
  supplied: boolean;
  id: number | null;
  company_name: string | null;
  status: string | null;
};

export type NormalizedConversationContext = {
  supplied: boolean;
  transcriptAvailable: boolean;
};
