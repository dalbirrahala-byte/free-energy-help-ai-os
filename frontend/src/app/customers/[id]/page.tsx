import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Customer = {
  id: number;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  notes: string | null;
  source_lead_id: number | null;
};

type Site = {
  id: number;
  name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  is_primary: boolean | null;
  current_supplier: string | null;
  contract_end: string | null;
};

type Activity = {
  id: number;
  activity_type: string | null;
  title: string | null;
  details: string | null;
  activity_date: string | null;
  activity_time: string | null;
  created_at: string;
};

type Task = {
  id: number;
  title: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
};

type CustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayValue(value: string | null) {
  return value || "Not provided";
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function primarySite(sites: Site[]): Site | null {
  if (sites.length === 0) {
    return null;
  }

  return sites.find((site) => site.is_primary) ?? sites[0];
}

export default async function CustomerDetailsPage({
  params,
}: CustomerPageProps) {
  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, created_at, company_name, contact_name, telephone, email, status, notes, source_lead_id",
    )
    .eq("id", customerId)
    .maybeSingle();

  const { data: sitesData } = await supabase
    .from("sites")
    .select(
      "id, name, address_line1, address_line2, city, postcode, is_primary, current_supplier, contract_end",
    )
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("customer_id", customerId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("customer_id", customerId)
    .order("activity_date", { ascending: false })
    .order("activity_time", { ascending: false });

  if (error || !data) {
    notFound();
  }

  const customer = data as Customer;
  const sites = (sitesData ?? []) as Site[];
  const mainSite = primarySite(sites);
  const customerTasks = (tasks ?? []) as Task[];
  const customerActivities = (activities ?? []) as Activity[];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/customers"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Customers
        </Link>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {customer.company_name || "Unnamed company"}
            </h1>

            <p className="mt-1 text-slate-500">
              Customer account and site supply information.
            </p>

            {customer.source_lead_id && (
              <p className="mt-2 text-sm text-slate-500">
                Converted from lead{" "}
                <Link
                  href={`/leads/${customer.source_lead_id}`}
                  className="font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  #{customer.source_lead_id}
                </Link>
              </p>
            )}
          </div>

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            {customer.status || "Active"}
          </span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Contact Details
            </h2>

            <div className="mt-5 space-y-5">
              <Detail
                label="Primary Contact"
                value={displayValue(customer.contact_name)}
              />
              <Detail label="Telephone" value={displayValue(customer.telephone)} />
              <Detail label="Email" value={displayValue(customer.email)} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Primary Site Supply
            </h2>

            <div className="mt-5 space-y-5">
              <Detail
                label="Site"
                value={displayValue(mainSite?.name ?? null)}
              />
              <Detail
                label="Current Supplier"
                value={displayValue(mainSite?.current_supplier ?? null)}
              />
              <Detail
                label="Contract End"
                value={formatDate(mainSite?.contract_end ?? null)}
              />
              <Detail
                label="Customer Since"
                value={formatDate(customer.created_at.slice(0, 10))}
              />
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Sites</h2>
          <p className="mt-1 text-sm text-slate-500">
            Multiple sites per customer are supported; additional sites and
            meters will be managed here in a future release.
          </p>

          {sites.length === 0 ? (
            <p className="mt-4 text-slate-500">No sites have been added yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {site.name || "Unnamed site"}
                      {site.is_primary && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[site.address_line1, site.postcode]
                        .filter(Boolean)
                        .join(", ") || "Address not set"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {site.current_supplier || "No supplier"} • Contract end{" "}
                    {formatDate(site.contract_end)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Notes</h2>

          <p className="mt-4 whitespace-pre-wrap text-slate-600">
            {displayValue(customer.notes)}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Follow-up Tasks</h2>

          {customerTasks.length === 0 ? (
            <p className="mt-4 text-slate-500">
              No follow-up tasks have been linked to this customer yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {customerTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {task.title || "Untitled task"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(task.due_date)}
                      {" • "}
                      {task.due_time?.slice(0, 5) || "No time"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {task.status || "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Activity History</h2>

          {customerActivities.length === 0 ? (
            <p className="mt-4 text-slate-500">
              No activities have been linked to this customer yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {customerActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {activity.title || activity.activity_type}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(activity.activity_date)}{" "}
                        {activity.activity_time?.slice(0, 5)}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {activity.activity_type}
                    </span>
                  </div>

                  {activity.details && (
                    <p className="mt-3 whitespace-pre-wrap text-slate-700">
                      {activity.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 flex justify-end">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
          >
            Edit Customer
          </Link>
        </div>
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}
