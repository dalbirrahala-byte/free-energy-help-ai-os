import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  notes: string | null;
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

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, contact_name, telephone, email, supplier, contract_end, status, notes",
    )
    .order("created_at", { ascending: false });

  const leads: Lead[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Leads</h1>

            <p className="mt-1 text-slate-500">
              Manage new enquiries and live transfer leads.
            </p>
          </div>

          <Link
  href="/leads/new"
  className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
>
  Add Lead
</Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The leads could not be loaded. Please check the Supabase
            connection.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Company</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Telephone</th>
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Contract End</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No leads have been added yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {lead.company_name || "Unnamed company"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {lead.contact_name || "Not provided"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {lead.telephone || "Not provided"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {lead.supplier || "Not provided"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatContractDate(lead.contract_end)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {lead.status || "New"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
  href={`/leads/${lead.id}`}
  className="font-semibold text-emerald-600 hover:text-emerald-700"
>
  View
</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}