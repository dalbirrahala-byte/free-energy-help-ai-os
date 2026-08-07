import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EditCustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Customer = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  notes: string | null;
};

type Site = {
  id: number;
  name: string | null;
  address_line1: string | null;
  postcode: string | null;
  is_primary: boolean | null;
  current_supplier: string | null;
  contract_end: string | null;
};

export default async function EditCustomerPage({
  params,
}: EditCustomerPageProps) {
  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, company_name, contact_name, telephone, email, status, notes",
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const customer = data as Customer;

  const { data: sitesData } = await supabase
    .from("customer_sites")
    .select(
      "id, name, address_line1, postcode, is_primary, current_supplier, contract_end",
    )
    .eq("customer_id", customerId)
    .eq("is_primary", true)
    .maybeSingle();

  let primarySite = sitesData as Site | null;

  if (!primarySite) {
    const { data: fallbackSite } = await supabase
      .from("customer_sites")
      .select(
        "id, name, address_line1, postcode, is_primary, current_supplier, contract_end",
      )
      .eq("customer_id", customerId)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    primarySite = fallbackSite as Site | null;
  }

  async function updateCustomer(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const companyName = String(formData.get("company_name") || "").trim();
    const contactName = String(formData.get("contact_name") || "").trim();
    const telephone = String(formData.get("telephone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const status = String(formData.get("status") || "Active").trim();
    const notes = String(formData.get("notes") || "").trim();
    const siteIdValue = String(formData.get("site_id") || "").trim();
    const siteName = String(formData.get("site_name") || "Primary site").trim();
    const addressLine1 = String(formData.get("address_line1") || "").trim();
    const postcode = String(formData.get("postcode") || "").trim();
    const supplier = String(formData.get("current_supplier") || "").trim();
    const contractEnd = String(formData.get("contract_end") || "").trim();

    if (!companyName) {
      throw new Error("Company name is required.");
    }

    const { error: customerError } = await supabase
      .from("customers")
      .update({
        company_name: companyName,
        contact_name: contactName || null,
        telephone: telephone || null,
        email: email || null,
        status: status || "Active",
        notes: notes || null,
      })
      .eq("id", customerId);

    if (customerError) {
      throw new Error(
        `The customer could not be updated: ${customerError.message}`,
      );
    }

    const sitePayload = {
      customer_id: customerId,
      name: siteName || "Primary site",
      address_line1: addressLine1 || null,
      postcode: postcode || null,
      is_primary: true,
      current_supplier: supplier || null,
      contract_end: contractEnd || null,
    };

    const siteId = siteIdValue ? Number(siteIdValue) : null;

    if (siteId && Number.isInteger(siteId)) {
      const { error: siteError } = await supabase
        .from("customer_sites")
        .update(sitePayload)
        .eq("id", siteId)
        .eq("customer_id", customerId);

      if (siteError) {
        throw new Error(
          `The primary site could not be updated: ${siteError.message}`,
        );
      }
    } else {
      const { error: siteError } = await supabase
        .from("customer_sites")
        .insert(sitePayload);

      if (siteError) {
        throw new Error(
          `The primary site could not be created: ${siteError.message}`,
        );
      }
    }

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    redirect(`/customers/${customerId}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/customers/${customer.id}`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Customer
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-bold text-slate-900">Edit Customer</h1>

          <p className="mt-1 text-slate-500">
            Update account details and the primary site supply information.
          </p>
        </div>

        <form
          action={updateCustomer}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <input
            type="hidden"
            name="site_id"
            value={primarySite?.id ?? ""}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <Field
              label="Company Name"
              name="company_name"
              defaultValue={customer.company_name}
              required
            />

            <Field
              label="Primary Contact"
              name="contact_name"
              defaultValue={customer.contact_name}
            />

            <Field
              label="Telephone"
              name="telephone"
              type="tel"
              defaultValue={customer.telephone}
            />

            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={customer.email}
            />

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
                defaultValue={customer.status || "Active"}
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
              defaultValue={primarySite?.name ?? "Primary site"}
            />
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-900">Primary site</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Field
                label="Address line 1"
                name="address_line1"
                defaultValue={primarySite?.address_line1}
              />

              <Field
                label="Postcode"
                name="postcode"
                defaultValue={primarySite?.postcode}
              />

              <Field
                label="Current Supplier"
                name="current_supplier"
                defaultValue={primarySite?.current_supplier}
              />

              <Field
                label="Contract End Date"
                name="contract_end"
                type="date"
                defaultValue={primarySite?.contract_end}
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
              defaultValue={customer.notes || ""}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/customers/${customer.id}`}
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
  defaultValue?: string | null;
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
        {required && <span className="ml-1 text-red-500">*</span>}
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
