import type { Metadata } from "next";

import {
  BusinessEnergyQuoteForm,
  PublicBrandHeader,
} from "@/components/website-leads/BusinessEnergyQuoteForm";

export const metadata: Metadata = {
  title: "Compare Business Energy Prices | Free Energy Help",
  description:
    "Request a no-obligation UK commercial energy review with an experienced consultant.",
};

export default function BusinessEnergyQuotePage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <PublicBrandHeader />

        <div className="mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Compare Business Energy Prices
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Speak to an experienced UK commercial energy consultant and review your current contract,
            renewal options, and potential savings.
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            "UK commercial energy support",
            "No obligation review",
            "Dedicated consultant",
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <BusinessEnergyQuoteForm />
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Demo MVP — enquiries are stored in your browser only until CRM integration is configured.
        </p>
      </div>
    </div>
  );
}
