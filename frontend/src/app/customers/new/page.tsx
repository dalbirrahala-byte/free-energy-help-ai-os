import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function NewCustomerPage() {
  async function addCustomer(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const companyName = String(formData.get("company_name") || "").trim();
    const contactName = String(formData.get("contact_name") || "").trim();
    const telephone = String(formData.get("telephone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const supplier = String(formData.get("current_supplier") || "").trim();
    const contractEnd = String(formData.get("contract_end") || "").trim();
    const status = String(formData.get("status") || "Active").trim();
    const notes = String(formData.get("notes") || "").trim();
    const siteName = String(formData.get("site_name") || "Primary site").trim();
    const addressLine1 = String(formData.get("address_line1") || "").trim();
    const postcode = String(formData.get("postcode") || "").trim();

    if (!companyName) {
      throw new Error("Company name is required.");
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        company_name: companyName,
        contact_name: contactName || null,
        telephone: telephone || null,
        email: email || null,
        status: status || "Active",
        notes: notes || null,
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      throw new Error(
        `The customer could not be saved: ${customerError?.message ?? "Unknown error"}`,
      );
    }

    const { error: siteError } = await supabase.from("customer_sites").insert({
      customer_id: customer.id,
      name: siteName || "Primary site",
      address_line1: addressLine1 || null,
      postcode: postcode || null,
      is_primary: true,
      current_supplier: supplier || null,
      contract_end: contractEnd || null,
    });

    if (siteError) {
      throw new Error(
        `The primary site could not be saved: ${siteError.message}`,
      );
    }

    revalidatePath("/customers");
    redirect("/customers");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/customers"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Add New Customer
          </h1>

          <p className="mt-1 text-slate-500">
            Add a customer account and primary site. Additional sites can be
            added later.
          </p>
        </div>

        <form
          action={addCustomer}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Company Name" name="company_name" required />

            <Field label="Primary Contact" name="contact_name" />

            <Field label="Telephone" name="telephone" type="tel" />

            <Field label="Email" name="email" type="email" />

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Customer Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="Active"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option>Active</option>
                <option>On Supply</option>
                <option>Renewal Due</option>
                <option>Terminated</option>
                <option>Inactive</option>
              </select>
            </div>

            <Field
              label="Primary Site Name"
              name="site_name"
              defaultValue="Primary site"
            />
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-900">Primary site</h2>
            <p className="mt-1 text-sm text-slate-500">
              Supply and address details for the main site (MPANs and meters
              will be added here later).
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Field label="Address line 1" name="address_line1" />

              <Field label="Postcode" name="postcode" />

              <Field label="Current Supplier" name="current_supplier" />

              <Field
                label="Contract End Date"
                name="contract_end"
                type="date"
              />
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Account notes, billing preferences, or renewal information..."
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href="/customers"
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Save Customer
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
  defaultValue?: string;
};

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
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
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}
