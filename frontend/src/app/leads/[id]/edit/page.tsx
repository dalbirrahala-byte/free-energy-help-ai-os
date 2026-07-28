import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function EditLeadPage({
  params,
}: EditLeadPageProps) {
  const { id } = await params;
  const leadId = Number(id);

  if (!Number.isInteger(leadId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, contact_name, telephone, email, supplier, contract_end, status, notes",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const lead = data as Lead;

  async function updateLead(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const companyName = String(
      formData.get("company_name") || "",
    ).trim();

    const contactName = String(
      formData.get("contact_name") || "",
    ).trim();

    const telephone = String(
      formData.get("telephone") || "",
    ).trim();

    const email = String(formData.get("email") || "").trim();

    const supplier = String(
      formData.get("supplier") || "",
    ).trim();

    const contractEnd = String(
      formData.get("contract_end") || "",
    ).trim();

    const status = String(
      formData.get("status") || "New",
    ).trim();

    const notes = String(formData.get("notes") || "").trim();

    if (!companyName) {
      throw new Error("Company name is required.");
    }

    const { error } = await supabase
      .from("leads")
      .update({
        company_name: companyName,
        contact_name: contactName || null,
        telephone: telephone || null,
        email: email || null,
        supplier: supplier || null,
        contract_end: contractEnd || null,
        status: status || "New",
        notes: notes || null,
      })
      .eq("id", leadId);

    if (error) {
      throw new Error(
        `The lead could not be updated: ${error.message}`,
      );
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);

    redirect(`/leads/${leadId}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Lead
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-bold text-slate-900">
            Edit Lead
          </h1>

          <p className="mt-1 text-slate-500">
            Update the customer and energy information.
          </p>
        </div>

        <form
          action={updateLead}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Company Name"
              name="company_name"
              defaultValue={lead.company_name}
              required
            />

            <Field
              label="Contact Name"
              name="contact_name"
              defaultValue={lead.contact_name}
            />

            <Field
              label="Telephone"
              name="telephone"
              type="tel"
              defaultValue={lead.telephone}
            />

            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={lead.email}
            />

            <Field
              label="Current Supplier"
              name="supplier"
              defaultValue={lead.supplier}
            />

            <Field
              label="Contract End Date"
              name="contract_end"
              type="date"
              defaultValue={lead.contract_end}
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
                defaultValue={lead.status || "New"}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option>New</option>
                <option>Contacted</option>
                <option>Qualified</option>
                <option>Quote Sent</option>
                <option>Negotiation</option>
                <option>Won</option>
                <option>Lost</option>
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
              defaultValue={lead.notes || ""}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/leads/${lead.id}`}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Save Changes
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
  defaultValue: string | null;
  required?: boolean;
};

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue || ""}
        required={required}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}