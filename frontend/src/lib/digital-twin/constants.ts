export const DEMO_TWIN_LABEL =
  "Commercial Digital Twin — demonstration architecture only. No live APIs or Supabase.";

export const DEMO_DATA = "Demo data";

export const HEALTH_CATEGORIES = [
  "Revenue",
  "Retention",
  "Commission",
  "Supplier Risk",
  "Data Quality",
  "Consumption",
  "Carbon",
  "Growth",
] as const;

export const GROWTH_OPPORTUNITIES = [
  "Solar",
  "Battery",
  "EV",
  "Water",
  "Telecoms",
  "Insurance",
  "Merchant Services",
  "kVA Review",
  "MOP Review",
  "DC Review",
] as const;

export const RELATIONSHIP_LAYERS = [
  "Customer",
  "Sites",
  "Meters",
  "Contracts",
  "Suppliers",
  "Commissions",
  "Invoices",
  "Renewals",
  "Quotes",
  "Tasks",
  "Documents",
] as const;

export const GRAPH_NODE_TYPES = [
  "customer",
  "site",
  "meter",
  "contract",
  "supplier",
  "commission",
  "renewal",
  "quote",
  "task",
] as const;
