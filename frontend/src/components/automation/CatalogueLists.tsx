import { SectionCard } from "@/components/dashboard/SectionCard";

export function CatalogueLists({
  triggers,
  conditions,
  actions,
}: {
  triggers: string[];
  conditions: string[];
  actions: string[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Catalogue title="Trigger catalogue" items={triggers} />
      <Catalogue title="Condition catalogue" items={conditions} />
      <Catalogue title="Action catalogue" items={actions} />
    </div>
  );
}

function Catalogue({ title, items }: { title: string; items: string[] }) {
  return (
    <SectionCard title={title} description="Reference list">
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </SectionCard>
  );
}
