"use client";

import { Zap } from "lucide-react";
import { useState } from "react";

import { RENEWAL_TIMING_OPTIONS } from "@/lib/website-leads/constants";
import { createWebsiteLeadFromForm } from "@/lib/website-leads/storage";
import type { WebsiteLeadFormInput } from "@/lib/website-leads/types";
import {
  hasFormErrors,
  validateWebsiteLeadForm,
} from "@/lib/website-leads/validation";

const INITIAL_FORM: WebsiteLeadFormInput = {
  businessName: "",
  contactName: "",
  telephone: "",
  email: "",
  postcode: "",
  renewalTiming: "",
  consent: false,
};

export function BusinessEnergyQuoteForm() {
  const [form, setForm] = useState<WebsiteLeadFormInput>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateWebsiteLeadForm>>({});

  function updateField<K extends keyof WebsiteLeadFormInput>(
    key: K,
    value: WebsiteLeadFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateWebsiteLeadForm(form);
    if (hasFormErrors(validation)) {
      setErrors(validation);
      return;
    }

    try {
      createWebsiteLeadFromForm(form);
      setSubmitted(true);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch {
      setErrors({ form: "We could not save your enquiry. Please try again." });
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm"
        role="status"
      >
        <p className="text-lg font-semibold text-emerald-950">
          Thank you. Your business energy enquiry has been received. A consultant will contact you
          shortly.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-emerald-700 underline"
        >
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      noValidate
    >
      {errors.form && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.form}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="businessName"
          label="Business name"
          required
          error={errors.businessName}
          value={form.businessName}
          onChange={(value) => updateField("businessName", value)}
        />
        <Field
          id="contactName"
          label="Contact name"
          required
          error={errors.contactName}
          value={form.contactName}
          onChange={(value) => updateField("contactName", value)}
        />
        <Field
          id="telephone"
          label="Telephone number"
          required
          type="tel"
          autoComplete="tel"
          error={errors.telephone}
          value={form.telephone}
          onChange={(value) => updateField("telephone", value)}
        />
        <Field
          id="email"
          label="Email address"
          required
          type="email"
          autoComplete="email"
          error={errors.email}
          value={form.email}
          onChange={(value) => updateField("email", value)}
        />
        <Field
          id="postcode"
          label="Business postcode"
          required
          error={errors.postcode}
          value={form.postcode}
          onChange={(value) => updateField("postcode", value)}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <label htmlFor="renewalTiming" className="text-sm font-semibold text-slate-700">
            Renewal timing <span className="text-red-600">*</span>
          </label>
          <select
            id="renewalTiming"
            value={form.renewalTiming}
            onChange={(event) =>
              updateField("renewalTiming", event.target.value as WebsiteLeadFormInput["renewalTiming"])
            }
            className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm ${
              errors.renewalTiming ? "border-red-300" : "border-slate-300"
            }`}
          >
            <option value="">Select renewal window</option>
            {RENEWAL_TIMING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.renewalTiming && (
            <p className="mt-1 text-sm text-red-600">{errors.renewalTiming}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) => updateField("consent", event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            I agree that Free Energy Help may contact me about this business energy enquiry.{" "}
            <span className="text-red-600">*</span>
          </span>
        </label>
        {errors.consent && <p className="mt-1 text-sm text-red-600">{errors.consent}</p>}
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-base font-semibold text-white hover:bg-emerald-600 sm:w-auto"
      >
        Request My Energy Review
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  value,
  onChange,
  type = "text",
  autoComplete,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm ${
          error ? "border-red-300" : "border-slate-300"
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function PublicBrandHeader() {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
        <Zap size={22} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-emerald-600">Free Energy Help</p>
        <p className="text-xs text-slate-500">Commercial energy consultants</p>
      </div>
    </header>
  );
}
