import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAuditEvent, recordAuditEvent } from "@/lib/audit/log";
import { requireOperationalPermission } from "@/lib/auth/enforceWrite";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STATUSES } from "@/lib/dashboard/dates";
import { syncLeadQualification } from "@/lib/revenue-engine/syncLeadQualification";
import type { CanonicalLead } from "@/lib/shared/domain";

export default function NewLeadPage() {
  async function addLead(formData: FormData) {
    "use server";

    const user = await requireOperationalPermission("records:write");
    const supabase = await createClient();

    const companyName = String(formData.get("company_name") || "").trim();
    const contactName = String(formData.get("contact_name") || "").trim();
    const telephone = String(formData.get("telephone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const supplier = String(formData.get("supplier") || "").trim();
    const contractEnd = String(formData.get("contract_end") || "").trim();
    const status = String(formData.get("status") || "New").trim();
    const notes = String(formData.get("notes") || "").trim();
    const leadSource = String(formData.get("lead_source") || "").trim();
    const sourceDetail = String(formData.get("source_detail") || "").trim();

    if (!companyName) {
      throw new Error("Company name is required.");
    }

    const { data: inserted, error } = await supabase
      .from("leads")
      .insert({
        company_name: companyName,
        contact_name: contactName || null,
        telephone: telephone || null,
        email: email || null,
        supplier: supplier || null,
        contract_end: contractEnd || null,
        status: status || "New",
        notes: notes || null,
        lead_source: leadSource || null,
        source_detail: sourceDetail || null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`The lead could not be saved: ${error.message}`);
    }

    await recordAuditEvent(
      supabase,
      buildAuditEvent({
        action: "lead_created",
        actorId: user.id,
        actorRole: user.role,
        entityType: "lead",
        entityId: inserted?.id ?? null,
        result: "success",
        metadata: { status: status || "New" },
      }),
    );

    if (inserted?.id) {
      // Best-effort: an initial qualification score is a convenience, not a
      // requirement for the lead to exist — never block or fail lead
      // creation if this degrades (matches the audit call above, which is
      // also fire-and-forget with respect to the primary action).
      try {
        const leadForClassification: CanonicalLead = {
          id: inserted.id,
          created_at: new Date().toISOString(),
          company_name: companyName,
          contact_name: contactName || null,
          telephone: telephone || null,
          email: email || null,
          supplier: supplier || null,
          contract_end: contractEnd || null,
          status: status || "New",
          notes: notes || null,
          lead_source: leadSource || null,
          source_detail: sourceDetail || null,
          source_provenance: "user-entered",
        };

        await syncLeadQualification(supabase, leadForClassification, [], { id: user.id, role: user.role }, new Date());
      } catch (syncError) {
        console.warn(
          `[Qualification] Failed to score newly created lead ${inserted.id}: ${
            syncError instanceof Error ? syncError.message : String(syncError)
          }`,
        );
      }
    }

    revalidatePath("/leads");
    redirect("/leads");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/leads"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Leads
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Add New Lead
          </h1>

          <p className="mt-1 text-slate-500">
            Add a new commercial energy enquiry or live transfer.
          </p>
        </div>

        <form
          action={addLead}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Company Name"
              name="company_name"
              required
            />

            <Field
              label="Contact Name"
              name="contact_name"
            />

            <Field
              label="Telephone"
              name="telephone"
              type="tel"
            />

            <Field
              label="Email"
              name="email"
              type="email"
            />

            <Field
              label="Current Supplier"
              name="supplier"
            />

            <Field
              label="Contract End Date"
              name="contract_end"
              type="date"
            />

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Lead Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="New"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {PIPELINE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="lead_source"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Lead Source
              </label>

              <select
                id="lead_source"
                name="lead_source"
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Not specified</option>
                <option>Website</option>
                <option>Referral</option>
                <option>Outbound</option>
                <option>AI Search</option>
                <option>Import</option>
                <option>Manual</option>
              </select>
            </div>

            <Field
              label="Source Detail"
              name="source_detail"
            />
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Add information about the enquiry, usage, meters or follow-up..."
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/leads"
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
};

function Field({
  label,
  name,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}