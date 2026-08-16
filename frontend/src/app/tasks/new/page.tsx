
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAuditEvent, recordAuditEvent } from "@/lib/audit/log";
import { requireOperationalPermission } from "@/lib/auth/enforceWrite";
import { createClient } from "@/lib/supabase/server";
import { isLeadActionRecommendationLabel } from "@/lib/revenue-engine/leadActionRecommendation";
import { buildActionControlAuditSequence, enforceActionEligibility } from "@/lib/revenue-engine/actionControlAudit";
import type { LeadQualityClassification } from "@/lib/revenue-engine/leadQualityClassification";

type Lead = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
};

type NewTaskPageProps = {
  /**
   * Factory 029: optional pre-fill from a lead's "Recommended Action" card
   * (`?lead_id=&title=`). Pre-fills the form only — the task is never
   * created until the salesperson reviews and submits it themselves.
   */
  searchParams: Promise<{ lead_id?: string; title?: string }>;
};

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const { lead_id: prefillLeadId, title: prefillTitle } = await searchParams;

  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("id, company_name, contact_name")
    .order("company_name", { ascending: true });

  const leads: Lead[] = data ?? [];

  async function addTask(formData: FormData) {
    "use server";

    const user = await requireOperationalPermission("records:write");
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
    const recommendedAction = String(formData.get("recommended_action") || "").trim();

    // Factory 031: Action Eligibility / Authorization Audit boundary. Only
    // runs when this submission is linked to a Recommended Action (the
    // hidden field below is populated exclusively by Factory 029/030's
    // pre-fill links) and the lead has a real, persisted classification —
    // an ordinary manual task, or one for an unscored lead, never enters
    // this block and is completely unaffected. Within this narrow path,
    // an ineligible result (Reject lead, or a marketing action without
    // consent) is recorded honestly in the audit trail and then genuinely
    // blocks this task from being created — enforceActionEligibility()
    // throws using this file's own existing validation pattern (see the
    // title check above). "action_authorized" means only "the existing
    // manual workflow may proceed" — no customer is contacted and no
    // external system is invoked anywhere in this file, whether the
    // result is authorized or blocked.
    if (leadId && isLeadActionRecommendationLabel(recommendedAction)) {
      const { data: leadForEligibility } = await supabase
        .from("leads")
        .select("id, consent_given, qualification_classification")
        .eq("id", leadId)
        .maybeSingle();

      if (leadForEligibility?.qualification_classification) {
        const { eligibility, events } = buildActionControlAuditSequence(
          leadForEligibility,
          leadForEligibility.qualification_classification as LeadQualityClassification,
          recommendedAction,
          { id: user.id, role: user.role },
        );

        for (const event of events) {
          await recordAuditEvent(supabase, event);
        }

        enforceActionEligibility(eligibility);
      }
    }

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert({
        lead_id: leadId,
        title,
        due_date: dueDate || null,
        due_time: dueTime || null,
        priority: priority || "Medium",
        status: status || "Open",
        notes: notes || null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`The task could not be saved: ${error.message}`);
    }

    await recordAuditEvent(
      supabase,
      buildAuditEvent({
        action: status === "Completed" ? "task_completed" : "task_created",
        actorId: user.id,
        actorRole: user.role,
        entityType: "task",
        entityId: inserted?.id ?? null,
        result: "success",
        metadata: { leadId, priority: priority || "Medium" },
      }),
    );

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

        {prefillLeadId && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Pre-filled from that lead&apos;s Recommended Action — review and edit before saving. Nothing is created until you click
            &quot;Save Task&quot;.
          </div>
        )}

        <form
          action={addTask}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          {/* Factory 031: carries the originating Recommended Action label through to addTask so the eligibility/audit sequence can run, independent of whatever the salesperson edits the visible title to below. */}
          <input type="hidden" name="recommended_action" value={prefillTitle ?? ""} />

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
                defaultValue={prefillTitle ?? ""}
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
                defaultValue={prefillLeadId ?? ""}
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