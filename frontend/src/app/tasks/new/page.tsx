
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Lead = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
};

export default async function NewTaskPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("id, company_name, contact_name")
    .order("company_name", { ascending: true });

  const leads: Lead[] = data ?? [];

  async function addTask(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const title = String(formData.get("title") || "").trim();
    const leadIdValue = String(formData.get("lead_id") || "").trim();
    const dueDate = String(formData.get("due_date") || "").trim();
    const dueTime = String(formData.get("due_time") || "").trim();
    const priority = String(
      formData.get("priority") || "Medium",
    ).trim();
    const status = String(formData.get("status") || "Open").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!title) {
      throw new Error("Task title is required.");
    }

    const leadId = leadIdValue ? Number(leadIdValue) : null;

    const { error } = await supabase.from("tasks").insert({
      lead_id: leadId,
      title,
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority: priority || "Medium",
      status: status || "Open",
      notes: notes || null,
    });

    if (error) {
      throw new Error(`The task could not be saved: ${error.message}`);
    }

    revalidatePath("/tasks");
    redirect("/tasks");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/tasks"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Tasks
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-bold text-slate-900">
            Add Follow-up Task
          </h1>

          <p className="mt-1 text-slate-500">
            Create a customer call, reminder or sales follow-up.
          </p>
        </div>

        <form
          action={addTask}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Task Title
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="For example: Call customer about renewal"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="lead_id"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Link to Lead
              </label>

              <select
                id="lead_id"
                name="lead_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">No lead selected</option>

                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name || "Unnamed company"}
                    {lead.contact_name
                      ? ` — ${lead.contact_name}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                defaultValue="Medium"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="due_date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Due Date
              </label>

              <input
                id="due_date"
                name="due_date"
                type="date"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="due_time"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Due Time
              </label>

              <input
                id="due_time"
                name="due_time"
                type="time"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="Open"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option>Open</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={5}
              placeholder="Add instructions, customer comments or follow-up information..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/tasks"
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}