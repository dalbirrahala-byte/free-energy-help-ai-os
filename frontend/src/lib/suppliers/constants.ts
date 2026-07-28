export const DEMO_SUPPLIER_LABEL =
  "Demonstration data only — no supplier APIs, live pricing, or live performance metrics connected.";

export const SUPPLIER_STATUSES = [
  "Active",
  "Preferred",
  "Limited appetite",
  "Temporarily unavailable",
  "Under review",
  "Suspended",
] as const;

export const SUPPLIER_RISK_LEVELS = ["Low", "Medium", "High", "Critical"] as const;

export const SECTOR_APPETITE_LEVELS = [
  "Strong appetite",
  "Selective",
  "Limited",
  "Not currently available",
] as const;

export const MARKET_SEGMENTS = ["SME", "Corporate", "Industrial", "Public sector"] as const;

export const SECTORS = [
  "Hospitality",
  "Manufacturing",
  "Retail",
  "Warehousing",
  "Offices",
  "Care",
  "Education",
  "Leisure",
  "Food production",
  "Automotive",
  "Property management",
  "Multi-site portfolios",
] as const;

export const SUPPLIER_ACTIONS = [
  "View supplier",
  "Compare supplier",
  "Add internal note",
  "Schedule review",
  "Open commission records",
  "View related quotes",
  "View related contracts",
  "Export supplier report",
] as const;

export const DEMO_KPI_SUFFIX = "(demo)";
