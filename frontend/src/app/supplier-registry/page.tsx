import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { SupplierRegistryView } from "@/components/supplier-registry/SupplierRegistryView";
import { loadSupplierProducts, loadSuppliers } from "@/lib/supplier-intelligence/queries";

export const metadata: Metadata = {
  title: "Supplier Registry | Free Energy Help AI OS",
  description: "Live supplier and product registry (Factory 022 Stage 2)",
};

export default async function SupplierRegistryPage() {
  const [suppliers, products] = await Promise.all([loadSuppliers(), loadSupplierProducts()]);

  return (
    <AppShell
      activeHref="/supplier-registry"
      title="Supplier Registry"
      subtitle="Live supplier and product registry"
      headerContext="Supplier Registry"
    >
      <SupplierRegistryView suppliers={suppliers} products={products} />
    </AppShell>
  );
}
