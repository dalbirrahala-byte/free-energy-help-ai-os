import { notFound } from "next/navigation";

import { Customer360Workspace } from "@/components/customer-360/Customer360Workspace";
import { AppShell } from "@/components/layout/AppShell";
import { loadCustomer360 } from "@/lib/customer-360/load-customer-360";

type Customer360PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailsPage({ params }: Customer360PageProps) {
  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    notFound();
  }

  const view = await loadCustomer360(customerId);

  if (!view) {
    notFound();
  }

  return (
    <AppShell
      activeHref="/customers"
      title="Customer 360"
      subtitle={view.header.companyName}
      headerContext="Customers"
    >
      <Customer360Workspace view={view} />
    </AppShell>
  );
}
