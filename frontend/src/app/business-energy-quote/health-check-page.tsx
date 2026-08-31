import type { Metadata } from "next";
import { headers } from "next/headers";

import { BusinessEnergyQuoteForm, PublicBrandHeader } from "@/components/website-leads/BusinessEnergyQuoteForm";
import { classifyAcquisitionOrigin } from "@/lib/website-leads/classifyAcquisitionOrigin";

export const metadata: Metadata = {
  title: "Free Business Energy Health Check | Free Energy Help",
  description: "Request a Free Business Energy Health Check for your organisation.",
  alternates: { canonical: "/free-business-energy-health-check" },
};

type HealthCheckPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const unambiguousValue = (value: string | string[] | undefined) => typeof value === "string" ? value : null;

export default async function HealthCheckPage({ searchParams }: HealthCheckPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const acquisitionOrigin = classifyAcquisitionOrigin({
    referrer: requestHeaders.get("referer"),
    siteHostname: requestHeaders.get("host"),
  }).origin;

  return <div className="min-h-screen bg-slate-100"><div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
    <PublicBrandHeader />
    <div className="mt-10"><h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Free Business Energy Health Check</h1>
      <p className="mt-4 text-lg text-slate-600">Tell us about your organisation and what you need help with. A consultant can review the information you provide and discuss appropriate next steps; submitting does not guarantee savings, a quotation or supplier acceptance.</p></div>
    <ul className="mt-8 grid gap-3 sm:grid-cols-3">{["A review of your enquiry", "Clear next-step discussion", "No automatic contact or quotation"].map((item) => <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm">{item}</li>)}</ul>
    <div className="mt-10"><BusinessEnergyQuoteForm utmSource={unambiguousValue(params.utm_source)} utmMedium={unambiguousValue(params.utm_medium)} utmCampaign={unambiguousValue(params.utm_campaign)} utmTerm={unambiguousValue(params.utm_term)} utmContent={unambiguousValue(params.utm_content)} campaign={unambiguousValue(params.campaign)} acquisitionOrigin={acquisitionOrigin} /></div>
    <p className="mt-8 text-center text-xs text-slate-500">Your enquiry is submitted securely to our energy consultant team.</p>
  </div></div>;
}
