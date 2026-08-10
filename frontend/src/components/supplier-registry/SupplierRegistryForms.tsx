"use client";

import { useActionState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { createSupplierAction, createSupplierProductAction } from "@/lib/supplier-intelligence/actions";
import {
  INITIAL_SUPPLIER_FORM_STATE,
  type SupplierFormState,
  type SupplierRow,
} from "@/lib/supplier-intelligence/types";

const STATUS_OPTIONS = [
  "Active",
  "Preferred",
  "Limited appetite",
  "Temporarily unavailable",
  "Under review",
  "Suspended",
];
const RISK_LEVEL_OPTIONS = ["Low", "Medium", "High", "Critical"];
const MARKET_SEGMENT_OPTIONS = ["SME", "Corporate", "Industrial", "Public sector"];
const FUEL_TYPE_OPTIONS = ["Electricity", "Gas", "Dual"];
const RATE_TYPE_OPTIONS = ["Fixed", "Flex", "Renewable"];

function FormMessage({ status, message }: SupplierFormState) {
  if (status === "idle" || !message) {
    return null;
  }

  const tone =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";

  return (
    <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${tone}`} role="status">
      {message}
    </p>
  );
}

export function AddSupplierForm() {
  const [state, formAction, isPending] = useActionState(createSupplierAction, INITIAL_SUPPLIER_FORM_STATE);

  return (
    <SectionCard title="Add a supplier" description="Creates a live row in the suppliers table.">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier name" name="name" required />
        <Field label="Category" name="category" />

        <SelectField label="Status" name="status" options={STATUS_OPTIONS} defaultValue="Active" />
        <SelectField label="Risk level" name="risk_level" options={RISK_LEVEL_OPTIONS} includeBlank />
        <SelectField label="Market segment" name="market_segment" options={MARKET_SEGMENT_OPTIONS} includeBlank />

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Checkbox label="Preferred supplier" name="is_preferred" />
          <Checkbox label="Electricity available" name="electricity_available" />
          <Checkbox label="Gas available" name="gas_available" />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="supplier-notes" className="mb-2 block text-sm font-semibold text-slate-700">
            Notes
          </label>
          <textarea
            id="supplier-notes"
            name="notes"
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Add supplier"}
          </button>
          <FormMessage status={state.status} message={state.message} />
        </div>
      </form>
    </SectionCard>
  );
}

export function AddSupplierProductForm({ suppliers }: { suppliers: SupplierRow[] }) {
  const [state, formAction, isPending] = useActionState(
    createSupplierProductAction,
    INITIAL_SUPPLIER_FORM_STATE,
  );

  if (suppliers.length === 0) {
    return (
      <SectionCard title="Add a product" description="Creates a live row in the supplier_products table.">
        <p className="text-sm text-slate-500">Add a supplier first before adding a product.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Add a product" description="Creates a live row in the supplier_products table.">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-supplier" className="mb-2 block text-sm font-semibold text-slate-700">
            Supplier <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            id="product-supplier"
            name="supplier_id"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <Field label="Product name" name="product_name" required />
        <SelectField label="Fuel type" name="fuel_type" options={FUEL_TYPE_OPTIONS} required />
        <SelectField label="Rate type" name="rate_type" options={RATE_TYPE_OPTIONS} required />
        <Field label="Min term (months)" name="min_term_months" type="number" />
        <Field label="Max term (months)" name="max_term_months" type="number" />

        <div className="sm:col-span-2">
          <label htmlFor="product-notes" className="mb-2 block text-sm font-semibold text-slate-700">
            Notes
          </label>
          <textarea
            id="product-notes"
            name="notes"
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Add product"}
          </button>
          <FormMessage status={state.status} message={state.message} />
        </div>
      </form>
    </SectionCard>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
};

function Field({ label, name, type = "text", required = false }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  includeBlank?: boolean;
  required?: boolean;
};

function SelectField({ label, name, options, defaultValue, includeBlank, required }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {includeBlank && <option value="">Not specified</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      {label}
    </label>
  );
}
