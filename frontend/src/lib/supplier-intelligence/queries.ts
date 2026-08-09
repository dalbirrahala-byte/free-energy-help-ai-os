import { createClient } from "@/lib/supabase/server";

import type {
  SupplierProductRow,
  SupplierProductsResult,
  SupplierRow,
  SuppliersResult,
} from "./types";

function mapSupplier(row: {
  id: number;
  name: string;
  category: string | null;
  status: string;
  is_preferred: boolean;
  electricity_available: boolean;
  gas_available: boolean;
  risk_level: string | null;
  market_segment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): SupplierRow {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    isPreferred: row.is_preferred,
    electricityAvailable: row.electricity_available,
    gasAvailable: row.gas_available,
    riskLevel: row.risk_level,
    marketSegment: row.market_segment,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupplierProduct(row: {
  id: number;
  supplier_id: number;
  product_name: string;
  fuel_type: string;
  rate_type: string;
  min_term_months: number | null;
  max_term_months: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): SupplierProductRow {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    productName: row.product_name,
    fuelType: row.fuel_type as SupplierProductRow["fuelType"],
    rateType: row.rate_type as SupplierProductRow["rateType"],
    minTermMonths: row.min_term_months,
    maxTermMonths: row.max_term_months,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Live read of the supplier registry (Factory 022 Stage 1). Not yet
 * wired into any page — this is a data-access layer only.
 */
export async function loadSuppliers(): Promise<SuppliersResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, name, category, status, is_preferred, electricity_available, gas_available, risk_level, market_segment, notes, created_at, updated_at",
    )
    .order("name", { ascending: true });

  if (error) {
    return { configured: false, suppliers: [] };
  }

  return { configured: true, suppliers: (data ?? []).map(mapSupplier) };
}

/**
 * Live read of supplier products/contract types. Pass `supplierId` to
 * scope to a single supplier, or omit for the full product catalogue.
 */
export async function loadSupplierProducts(supplierId?: number): Promise<SupplierProductsResult> {
  const supabase = await createClient();

  let query = supabase
    .from("supplier_products")
    .select(
      "id, supplier_id, product_name, fuel_type, rate_type, min_term_months, max_term_months, notes, created_at, updated_at",
    )
    .order("product_name", { ascending: true });

  if (typeof supplierId === "number") {
    query = query.eq("supplier_id", supplierId);
  }

  const { data, error } = await query;

  if (error) {
    return { configured: false, products: [] };
  }

  return { configured: true, products: (data ?? []).map(mapSupplierProduct) };
}
