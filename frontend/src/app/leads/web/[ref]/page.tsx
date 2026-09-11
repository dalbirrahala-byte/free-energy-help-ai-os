import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

import { WebsiteLeadWorkspace } from "@/components/website-leads/WebsiteLeadWorkspace";

type WebsiteLeadPageProps = {
  params: Promise<{ ref: string }>;
};

export default async function WebsiteLeadPage({ params }: WebsiteLeadPageProps) {
  const { ref } = await params;
  const leadReference = decodeURIComponent(ref);

  return (
    <AppShell activeHref="/leads" title="Website Lead" subtitle="Review a captured website enquiry." headerContext="Lead Management">
      <div className="mx-auto max-w-4xl">
        <WebsiteLeadWorkspace leadReference={leadReference} />
        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/business-energy-quote" className="text-emerald-600">
            Public capture page
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
