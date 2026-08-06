import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActivityHistoryActions } from "./ActivityHistoryActions";
import { CommercialEnergyIntelligenceCard } from "@/components/leads/CommercialEnergyIntelligenceCard";
import { calculateCommercialEnergyIntelligence } from "@/lib/commercial-energy-intelligence";
import { RenewalIntelligenceCard } from "@/components/leads/RenewalIntelligenceCard";
import { runRenewalShadowDeployment } from "@/lib/intelligence/renewalShadowDeployment";
import { CommercialIntelligencePanel } from "@/components/leads/CommercialIntelligencePanel";
import { buildCommercialIntelligenceViewModel } from "@/lib/commercial-intelligence/viewModel";

type Lead = {
  id: number;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  notes: string | null;
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
  
type LeadPageProps = {
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
  }).format(new Date(date));
}

export default async function LeadDetailsPage({
  params,
}: LeadPageProps) {
  const { id } = await params;
  const leadId = Number(id);

  if (!Number.isInteger(leadId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, company_name, contact_name, telephone, email, supplier, contract_end, status, notes",
    )
    .eq("id", leadId)
    .maybeSingle();

   const { data: tasks } = await supabase
  .from("tasks")
  .select("*")
  .eq("lead_id", leadId)
  .order("due_date", { ascending: true })
  .order("due_time", { ascending: true }); 
const leadTasks = (tasks ?? []) as Task[];

const { data: activities } = await supabase
  .from("activities")
  .select("*")
  .eq("lead_id", leadId)
  .order("activity_date", { ascending: false })
  .order("activity_time", { ascending: false });

const leadActivities = (activities ?? []) as Activity[];
  if (error || !data) {
    notFound();
  }

  const lead = data as Lead;

  const intelligence = calculateCommercialEnergyIntelligence(lead, leadActivities, leadTasks);
  const renewal = runRenewalShadowDeployment(lead).result;
  const commercialIntelligence = buildCommercialIntelligenceViewModel(
    lead,
    leadActivities,
    leadTasks,
    renewal.urgency.tier,
  );

  async function deleteActivity(formData: FormData) {
    "use server";

    const submittedLeadId = Number(formData.get("lead_id"));
    const activityId = Number(formData.get("activity_id"));

    if (
      !Number.isInteger(submittedLeadId) ||
      !Number.isInteger(activityId)
    ) {
      throw new Error("Invalid activity or lead.");
    }

    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("lead_id", submittedLeadId);

    if (deleteError) {
      throw new Error(
        `Activity could not be deleted: ${deleteError.message}`,
      );
    }

    revalidatePath(`/leads/${submittedLeadId}`);
    redirect(`/leads/${submittedLeadId}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/leads"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Leads
        </Link>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {lead.company_name || "Unnamed company"}
            </h1>

            <p className="mt-1 text-slate-500">
              Lead record and commercial energy information.
            </p>
          </div>

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            {lead.status || "New"}
          </span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Contact Details
            </h2>

            <div className="mt-5 space-y-5">
              <Detail label="Contact Name" value={displayValue(lead.contact_name)} />
              <Detail label="Telephone" value={displayValue(lead.telephone)} />
              <Detail label="Email" value={displayValue(lead.email)} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Energy Details
            </h2>

            <div className="mt-5 space-y-5">
              <Detail label="Current Supplier" value={displayValue(lead.supplier)} />
              <Detail label="Contract End" value={formatDate(lead.contract_end)} />
              <Detail label="Lead Created" value={formatDate(lead.created_at)} />
            </div>
          </section>
        </div>

        <div className="mt-6">
          <CommercialEnergyIntelligenceCard intelligence={intelligence} />
        </div>

        <div className="mt-6">
          <RenewalIntelligenceCard renewal={renewal} />
        </div>

        {commercialIntelligence.visible && (
          <div className="mt-6">
            <CommercialIntelligencePanel viewModel={commercialIntelligence} />
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Notes</h2>

          <p className="mt-4 whitespace-pre-wrap text-slate-600">
            {displayValue(lead.notes)}
          </p>
        </section>
<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="text-lg font-bold text-slate-900">Follow-up Tasks</h2>

  {leadTasks.length === 0 ? (
    <p className="mt-4 text-slate-500">
      No follow-up tasks have been created for this lead.
    </p>
  ) : (
    <div className="mt-4 space-y-3">
      {leadTasks.map((task) => (
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
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-lg font-bold text-slate-900">Activity History</h2>

    <Link
      href={`/leads/${lead.id}/activity/new`}
      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
    >
      + Add Activity
    </Link>
  </div>

  {leadActivities.length === 0 ? (
    <p className="text-slate-500">
      No activities have been recorded for this lead.
    </p>
  ) : (
    <div className="space-y-3">
      {leadActivities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">
                {activity.title || activity.activity_type}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {formatDate(activity.activity_date)}{" "}
                {activity.activity_time?.slice(0, 5)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {activity.activity_type}
              </span>

              <ActivityHistoryActions
                leadId={lead.id}
                activityId={activity.id}
                activityLabel={
                  activity.title ||
                  activity.activity_type ||
                  "this activity"
                }
                deleteActivity={deleteActivity}
              />
            </div>
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
  href={`/leads/${lead.id}/edit`}
  className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
>
  Edit Lead
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