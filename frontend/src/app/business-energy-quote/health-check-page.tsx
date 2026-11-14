import type { Metadata } from "next";
import { headers } from "next/headers";
import { ArrowRight, Check, CheckCircle2, Clock3, FileSearch, Phone, ShieldCheck, Zap } from "lucide-react";

import { BusinessEnergyQuoteForm } from "@/components/website-leads/BusinessEnergyQuoteForm";
import { classifyAcquisitionOrigin } from "@/lib/website-leads/classifyAcquisitionOrigin";

export const metadata: Metadata = {
  title: "Free Business Energy Health Check | Free Energy Help Ltd",
  description:
    "Request a no-obligation review of your business electricity or gas enquiry, including renewals, bills and meter concerns. Free Energy Help Ltd.",
  alternates: { canonical: "/free-business-energy-health-check" },
};

type HealthCheckPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const unambiguousValue = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : null;

const reviewTopics = [
  {
    title: "Contract renewals",
    description: "Understand your renewal timing and discuss the options available before your agreement ends.",
  },
  {
    title: "Electricity and gas bills",
    description: "Raise concerns about estimated readings, unexpected charges or confusing billing.",
  },
  {
    title: "Moving premises or changing tenancy",
    description: "Get guidance on the information needed when a business moves into or out of a property.",
  },
];

export default async function HealthCheckPage({ searchParams }: HealthCheckPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const acquisitionOrigin = classifyAcquisitionOrigin({
    referrer: requestHeaders.get("referer"),
    siteHostname: requestHeaders.get("host"),
  }).origin;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10">
          <a href="https://www.freeenergyhelp.co.uk/" className="flex items-center gap-3" aria-label="Free Energy Help home">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0c2d5a] text-white">
              <Zap className="h-6 w-6" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-[#0c2d5a]">Free Energy Help</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business energy guidance</span>
            </span>
          </a>
          <a href="tel:01332605506" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0c2d5a] hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Phone className="h-4 w-4" aria-hidden="true" />
            01332 605506
          </a>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#0a2347] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-52 h-[540px] w-[540px] rounded-full bg-[#1263ba]/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 left-1/4 h-[440px] w-[440px] rounded-full bg-[#0e997a]/20 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.88fr)] lg:items-start lg:gap-14 lg:px-10 lg:py-20">
          <div className="max-w-2xl lg:pt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              For UK businesses
            </span>
            <h1 className="mt-7 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.55rem]">
              Your business energy deserves a clearer review.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Contracts coming up for renewal? Questions about gas, electricity or unexpected bills?
              Tell us what your business needs, and an FEH consultant can discuss the next steps with you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#request-review" className="inline-flex items-center gap-2 rounded-xl bg-[#b2f18b] px-6 py-3.5 text-sm font-bold text-[#0a2347] shadow-lg shadow-black/10 transition hover:bg-[#c7f9aa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Request my free review
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <span className="text-sm font-medium text-blue-100">No obligation to switch supplier</span>
            </div>
            <div className="mt-11 grid max-w-xl gap-4 border-t border-white/20 pt-7 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <FileSearch className="mt-1 h-5 w-5 shrink-0 text-[#b2f18b]" aria-hidden="true" />
                <p className="text-sm leading-6 text-blue-100"><strong className="block text-white">Practical guidance</strong>Renewals, billing, meters and tenancy changes.</p>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#b2f18b]" aria-hidden="true" />
                <p className="text-sm leading-6 text-blue-100"><strong className="block text-white">Your choice</strong>Review your options without a commitment to switch.</p>
              </div>
            </div>
          </div>

          <div id="request-review" className="scroll-mt-5 overflow-hidden rounded-3xl border border-white/20 bg-white text-slate-900 shadow-2xl shadow-slate-950/30">
            <div className="bg-[#edf5ff] px-6 py-6 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1263ba]">Start here</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0c2d5a]">Free Business Energy Health Check</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Share a few details so our team can review your enquiry. There is no obligation to switch.
              </p>
            </div>
            <div className="landing-form bg-white px-2 py-2 sm:px-3 sm:py-3">
              <BusinessEnergyQuoteForm
                utmSource={unambiguousValue(params.utm_source)}
                utmMedium={unambiguousValue(params.utm_medium)}
                utmCampaign={unambiguousValue(params.utm_campaign)}
                utmTerm={unambiguousValue(params.utm_term)}
                utmContent={unambiguousValue(params.utm_content)}
                campaign={unambiguousValue(params.campaign)}
                acquisitionOrigin={acquisitionOrigin}
              />
            </div>
            <div className="border-t border-slate-100 px-6 py-4 text-xs leading-5 text-slate-500 sm:px-8">
              We will only use your enquiry details to handle your request in line with our privacy information. Submitting does not guarantee savings, a quote or supplier acceptance.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20" aria-labelledby="review-topics">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1263ba]">How we can help</p>
          <h2 id="review-topics" className="mt-3 text-3xl font-bold tracking-tight text-[#0c2d5a] sm:text-4xl">
            A useful conversation about your business energy.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            You do not need to know your meter numbers or have every bill ready to make an initial enquiry.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {reviewTopics.map((topic, index) => (
            <article key={topic.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f1ff] text-sm font-extrabold text-[#0c2d5a]">0{index + 1}</span>
              <h3 className="mt-5 text-lg font-bold text-[#0c2d5a]">{topic.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{topic.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white" aria-labelledby="next-steps">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1263ba]">What happens next</p>
            <h2 id="next-steps" className="mt-3 text-3xl font-bold tracking-tight text-[#0c2d5a]">Simple steps. Clear expectations.</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-600">This is a request for an initial review, not an automatic quote or a promise of savings.</p>
          </div>
          <ol className="space-y-5">
            <li className="flex items-start gap-4"><Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><strong className="text-[#0c2d5a]">Tell us about your business.</strong><p className="mt-1 text-sm leading-6 text-slate-600">Share your contact details, energy type and what you want help with.</p></div></li>
            <li className="flex items-start gap-4"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><strong className="text-[#0c2d5a]">We review your enquiry.</strong><p className="mt-1 text-sm leading-6 text-slate-600">A consultant can contact you about the information and next steps.</p></div></li>
            <li className="flex items-start gap-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><div><strong className="text-[#0c2d5a]">You decide how to proceed.</strong><p className="mt-1 text-sm leading-6 text-slate-600">There is no obligation to change supplier or enter an agreement.</p></div></li>
          </ol>
        </div>
      </section>

      <footer className="bg-[#0a2347] px-5 py-9 text-blue-100 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <div><p className="font-bold text-white">Free Energy Help Ltd</p><p className="mt-1 text-sm">Independent guidance for UK businesses</p></div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="tel:01332605506" className="font-semibold hover:underline">01332 605506</a>
            <a href="https://www.freeenergyhelp.co.uk/" className="hover:underline">freeenergyhelp.co.uk</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
