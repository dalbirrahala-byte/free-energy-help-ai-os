import { SectionCard } from "@/components/dashboard/SectionCard";
import { AUTOMATION_TEMPLATE_CARDS } from "@/lib/automation/templates";

type Template = (typeof AUTOMATION_TEMPLATE_CARDS)[number];

export function AutomationTemplatesGrid({ templates }: { templates: Template[] }) {
  return (
    <SectionCard title="Automation templates" description="Reusable starter workflows (demo)">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">{t.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{t.description}</p>
            <dl className="mt-3 space-y-1 text-xs text-slate-700">
              <div><dt className="inline font-semibold">Trigger: </dt><dd className="inline">{t.trigger}</dd></div>
              <div><dt className="inline font-semibold">Actions: </dt><dd className="inline">{t.actions}</dd></div>
              <div><dt className="inline font-semibold">Approval: </dt><dd className="inline">{t.approval}</dd></div>
              <div><dt className="inline font-semibold">Integrations: </dt><dd className="inline">{t.integrations}</dd></div>
              <div><dt className="inline font-semibold">Status: </dt><dd className="inline">{t.status}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
