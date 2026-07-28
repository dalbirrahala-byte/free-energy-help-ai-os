import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type NewActivityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewActivityPage({
  params,
}: NewActivityPageProps) {
  const { id } = await params;
  const leadId = Number(id);

  async function saveActivity(formData: FormData) {
    "use server";

    const activityType = String(formData.get("activity_type") || "");
    const title = String(formData.get("title") || "");
    const details = String(formData.get("details") || "");
    const activityDate = String(formData.get("activity_date") || "");
    const activityTime = String(formData.get("activity_time") || "");

    const supabase = await createClient();

    const { error } = await supabase.from("activities").insert({
      lead_id: leadId,
      activity_type: activityType,
      title,
      details,
      activity_date: activityDate || null,
      activity_time: activityTime || null,
    });

    if (error) {
      throw new Error(`Activity could not be saved: ${error.message}`);
    }

    revalidatePath(`/leads/${leadId}`);
    redirect(`/leads/${leadId}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold">Add Activity</h1>

        <form action={saveActivity} className="space-y-6">
          <div>
            <label className="mb-2 block font-semibold">Activity Type</label>

            <select
              name="activity_type"
              className="w-full rounded-lg border p-3"
              required
            >
              <option value="Telephone Call">Telephone Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Quote Sent">Quote Sent</option>
              <option value="Contract Renewal">Contract Renewal</option>
              <option value="Complaint">Complaint</option>
              <option value="General Note">General Note</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold">Title</label>

            <input
              name="title"
              className="w-full rounded-lg border p-3"
              placeholder="Short description"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">Activity Date</label>

            <input
              name="activity_date"
              type="date"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">Activity Time</label>

            <input
              name="activity_time"
              type="time"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">Detailed Notes</label>

            <textarea
              name="details"
              rows={6}
              className="w-full rounded-lg border p-3"
              placeholder="Enter full activity details..."
            />
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href={`/leads/${leadId}`}
              className="rounded-lg border px-6 py-3"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}