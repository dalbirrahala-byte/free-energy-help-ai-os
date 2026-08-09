import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import type { SupplierProductsResult, SuppliersResult } from "@/lib/supplier-intelligence/types";

const NOT_CONFIGURED = "Not configured";

type SupplierRegistryViewProps = {
  suppliers: SuppliersResult;
  products: SupplierProductsResult;
};

export function SupplierRegistryView({ suppliers, products }: SupplierRegistryViewProps) {
  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        role="status"
      >
        <p className="font-semibold">Supplier Registry — live data (Stage 2 preview)</p>
        <p className="mt-1">
          Reads directly from the suppliers and supplier_products tables. Shows &quot;Not
          configured&quot; until that schema is applied to the live database, and an empty list
          until suppliers are added — no demo or fabricated data is shown here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Suppliers"
          value={suppliers.configured ? String(suppliers.suppliers.length) : NOT_CONFIGURED}
          hint="Live rows in the suppliers table"
        />
        <StatCard
          title="Products"
          value={products.configured ? String(products.products.length) : NOT_CONFIGURED}
          hint="Live rows in the supplier_products table"
        />
      </div>

      <SectionCard title="Suppliers" description="Live supplier registry, sorted by name.">
        {!suppliers.configured ? (
          <p className="text-sm text-slate-500">
            The suppliers table is not yet available. This page will populate automatically once
            the Factory 022 schema is applied.
          </p>
        ) : suppliers.suppliers.length === 0 ? (
          <p className="text-sm text-slate-500">No suppliers have been added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-600">Name</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Preferred</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Fuels</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Market segment</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Risk</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{supplier.name}</td>
                    <td className="px-3 py-4 text-slate-600">{supplier.category || "Not provided"}</td>
                    <td className="px-3 py-4 text-slate-600">{supplier.status}</td>
                    <td className="px-3 py-4 text-slate-600">{supplier.isPreferred ? "Yes" : "No"}</td>
                    <td className="px-3 py-4 text-slate-600">
                      {[supplier.electricityAvailable && "Electricity", supplier.gasAvailable && "Gas"]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </td>
                    <td className="px-3 py-4 text-slate-600">{supplier.marketSegment || "Not provided"}</td>
                    <td className="px-3 py-4 text-slate-600">{supplier.riskLevel || "Not provided"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Products" description="Live supplier product/contract-type catalogue.">
        {!products.configured ? (
          <p className="text-sm text-slate-500">
            The supplier_products table is not yet available. This page will populate
            automatically once the Factory 022 schema is applied.
          </p>
        ) : products.products.length === 0 ? (
          <p className="text-sm text-slate-500">No products have been added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-600">Product</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Fuel type</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Rate type</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Term range</th>
                </tr>
              </thead>
              <tbody>
                {products.products.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{product.productName}</td>
                    <td className="px-3 py-4 text-slate-600">{product.fuelType}</td>
                    <td className="px-3 py-4 text-slate-600">{product.rateType}</td>
                    <td className="px-3 py-4 text-slate-600">
                      {product.minTermMonths && product.maxTermMonths
                        ? `${product.minTermMonths}–${product.maxTermMonths} months`
                        : "Not provided"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
