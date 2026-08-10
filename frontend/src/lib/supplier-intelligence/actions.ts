"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { SupplierFormState } from "./types";

/**
 * Inserts a row into public.suppliers via the standard anon-key server
 * client, so this is subject to the same RLS (user_can_write()) as every
 * other write in this app — no service-role bypass.
 */
export async function createSupplierAction(
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { status: "error", message: "Supplier name is required." };
  }

  const category = String(formData.get("category") || "").trim();
  const status = String(formData.get("status") || "Active").trim();
  const riskLevel = String(formData.get("risk_level") || "").trim();
  const marketSegment = String(formData.get("market_segment") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const supabase = await createClient();

  const { error } = await supabase.from("suppliers").insert({
    name,
    category: category || null,
    status: status || "Active",
    is_preferred: formData.get("is_preferred") === "on",
    electricity_available: formData.get("electricity_available") === "on",
    gas_available: formData.get("gas_available") === "on",
    risk_level: riskLevel || null,
    market_segment: marketSegment || null,
    notes: notes || null,
  });

  if (error) {
    return {
      status: "error",
      message: `The supplier could not be saved: ${error.message}`,
    };
  }

  revalidatePath("/supplier-registry");
  return { status: "success", message: `"${name}" was added to the supplier registry.` };
}

const VALID_FUEL_TYPES = new Set(["Electricity", "Gas", "Dual"]);
const VALID_RATE_TYPES = new Set(["Fixed", "Flex", "Renewable"]);

/**
 * Inserts a row into public.supplier_products. Validates fuel_type/
 * rate_type/term-range client-side-equivalent rules here too, matching
 * the CHECK constraints already defined on the table (20260809100000) —
 * this is belt-and-braces, not a replacement for the DB constraints.
 */
export async function createSupplierProductAction(
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const supplierId = Number(formData.get("supplier_id"));
  const productName = String(formData.get("product_name") || "").trim();
  const fuelType = String(formData.get("fuel_type") || "").trim();
  const rateType = String(formData.get("rate_type") || "").trim();

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return { status: "error", message: "Select a supplier before adding a product." };
  }

  if (!productName) {
    return { status: "error", message: "Product name is required." };
  }

  if (!VALID_FUEL_TYPES.has(fuelType)) {
    return { status: "error", message: "Choose a valid fuel type (Electricity, Gas, or Dual)." };
  }

  if (!VALID_RATE_TYPES.has(rateType)) {
    return { status: "error", message: "Choose a valid rate type (Fixed, Flex, or Renewable)." };
  }

  const minTermRaw = String(formData.get("min_term_months") || "").trim();
  const maxTermRaw = String(formData.get("max_term_months") || "").trim();
  const minTermMonths = minTermRaw ? Number(minTermRaw) : null;
  const maxTermMonths = maxTermRaw ? Number(maxTermRaw) : null;

  if (minTermMonths !== null && (!Number.isInteger(minTermMonths) || minTermMonths < 0)) {
    return { status: "error", message: "Minimum term must be a whole number of months." };
  }

  if (maxTermMonths !== null && (!Number.isInteger(maxTermMonths) || maxTermMonths < 0)) {
    return { status: "error", message: "Maximum term must be a whole number of months." };
  }

  if (minTermMonths !== null && maxTermMonths !== null && minTermMonths > maxTermMonths) {
    return { status: "error", message: "Minimum term cannot be greater than maximum term." };
  }

  const notes = String(formData.get("notes") || "").trim();

  const supabase = await createClient();

  const { error } = await supabase.from("supplier_products").insert({
    supplier_id: supplierId,
    product_name: productName,
    fuel_type: fuelType,
    rate_type: rateType,
    min_term_months: minTermMonths,
    max_term_months: maxTermMonths,
    notes: notes || null,
  });

  if (error) {
    return {
      status: "error",
      message: `The product could not be saved: ${error.message}`,
    };
  }

  revalidatePath("/supplier-registry");
  return { status: "success", message: `"${productName}" was added to the product catalogue.` };
}
