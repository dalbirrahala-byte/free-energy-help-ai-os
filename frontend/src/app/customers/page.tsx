import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SiteRow = {
  current_supplier: string | null;
  contract_end: string | null;
  is_primary: boolean | null;
};

type CustomerRow = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  sites: SiteRow[] | null;
};

function formatContractDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function primarySite(sites: SiteRow[] | null | undefined): SiteRow | null {
  if (!sites?.length) {
    return null;
  }

  return sites.find((site) => site.is_primary) ?? sites[0];
}

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      id,
      company_name,
      contact_name,
      telephone,
      email,
      status,
      sites (
        current_supplier,
        contract_end,
        is_primary
      )
    `,
    )
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as CustomerRow[];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>

            <p className="mt-1 text-slate-500">
              Manage your commercial energy customer book.
            </p>
          </div>

          <Link
            href="/customers/new"
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
          >
            Add Customer
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Customers could not be loaded. Apply the Supabase migration for
            customers and sites, then check your connection.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Company</th>
                  <th className="px-5 py-4 font-semibold">Primary contact</th>
                  <th className="px-5 py-4 font-semibold">Telephone</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Current supplier</th>
                  <th className="px-5 py-4 font-semibold">Contract end</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No customers have been added yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const site = primarySite(customer.sites);

                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {customer.company_name || "Unnamed company"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {customer.contact_name || "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {customer.telephone || "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {customer.email || "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {site?.current_supplier || "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatContractDate(site?.contract_end ?? null)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {customer.status || "Active"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
