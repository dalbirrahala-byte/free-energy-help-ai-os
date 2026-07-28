import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EditActivityPageProps = {
  params: Promise<{
    id: string;
    activityId: string;
  }>;
};

type Activity = {
  id: number;
  lead_id: number | null;
  activity_type: string | null;
  title: string | null;
  details: string | null;
  activity_date: string | null;
  activity_time: string | null;
};

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const { id, activityId } = await params;

  const leadId = Number(id);
  const selectedActivityId = Number(activityId);

  if (
    !Number.isInteger(leadId) ||
    !Number.isInteger(selectedActivityId)
  ) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, lead_id, activity_type, title, details, activity_date, activity_time"
    )
    .eq("id", selectedActivityId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const activity = data as Activity;

  async function updateActivity(formData: FormData) {
    "use server";

    const activityType = String(
      formData.get("activity_type") || ""
    ).trim();

    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const activityDate = String(
      formData.get("activity_date") || ""
    ).trim();
    const activityTime = String(
      formData.get("activity_time") || ""
    ).trim();

    if (!activityType || !title) {
      throw new Error("Activity type and title are required.");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("activities")
      .update({
        activity_type: activityType,
        title,
        details: details || null,
        activity_date: activityDate || null,
        activity_time: activityTime || null,
      })
      .eq("id", selectedActivityId)
      .eq("lead_id", leadId);

    if (error) {
      throw new Error(
        `Activity could not be updated: ${error.message}`
      );
    }

    revalidatePath(`/leads/${leadId}`);
    redirect(`/leads/${leadId}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/leads/${leadId}`}
          className="mb-4 inline-block font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Lead
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              Edit Activity
            </h1>

            <p className="mt-1 text-slate-500">
              Update the customer activity information.
            </p>
          </div>

          <form action={updateActivity} className="space-y-6">
            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Activity Type
              </label>

              <select
                name="activity_type"
                defaultValue={activity.activity_type || "Telephone Call"}
                className="w-full rounded-lg border border-slate-300 p-3"
                required
              >
                <option value="Telephone Call">Telephone Call</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Quote Sent">Quote Sent</option>
                <option value="Contract Renewal">
                  Contract Renewal
                </option>
                <option value="Complaint">Complaint</option>
                <option value="General Note">General Note</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Title
              </label>

              <input
                name="title"
                defaultValue={activity.title || ""}
                className="w-full rounded-lg border border-slate-300 p-3"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Activity Date
              </label>

              <input
                name="activity_date"
                type="date"
                defaultValue={activity.activity_date || ""}
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Activity Time
              </label>

              <input
                name="activity_time"
                type="time"
                defaultValue={activity.activity_time?.slice(0, 5) || ""}
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Detailed Notes
              </label>

              <textarea
                name="details"
                rows={6}
                defaultValue={activity.details || ""}
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
              <Link
                href={`/leads/${leadId}`}
                className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
