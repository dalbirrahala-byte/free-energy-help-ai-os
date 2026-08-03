import Link from "next/link";

import { WebsiteLeadWorkspace } from "@/components/website-leads/WebsiteLeadWorkspace";

type WebsiteLeadPageProps = {
  params: Promise<{ ref: string }>;
};

export default async function WebsiteLeadPage({ params }: WebsiteLeadPageProps) {
  const { ref } = await params;
  const leadReference = decodeURIComponent(ref);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        <WebsiteLeadWorkspace leadReference={leadReference} />
        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/business-energy-quote" className="text-emerald-600">
            Public capture page
          </Link>
        </p>
      </div>
    </main>
  );
}
