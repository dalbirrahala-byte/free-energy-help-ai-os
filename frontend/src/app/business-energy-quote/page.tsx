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

type BusinessEnergyQuotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function BusinessEnergyQuotePage({
  searchParams,
}: BusinessEnergyQuotePageProps) {
  const params = await searchParams;

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
          <BusinessEnergyQuoteForm
            utmSource={firstValue(params.utm_source)}
            utmMedium={firstValue(params.utm_medium)}
            utmCampaign={firstValue(params.utm_campaign)}
            utmTerm={firstValue(params.utm_term)}
            utmContent={firstValue(params.utm_content)}
          />
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Your enquiry is submitted securely to our energy consultant team.
        </p>
      </div>
    </div>
  );
}
