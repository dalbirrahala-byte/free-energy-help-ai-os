import { SectionCard } from "@/components/dashboard/SectionCard";

type BuilderExample = {
  trigger: string;
  condition: string;
  action: string;
  approval: string;
  result: string;
};

const STAGES = ["Trigger", "Condition", "Action", "Approval", "Result"] as const;

export function WorkflowBuilderPreview({ example }: { example: BuilderExample }) {
  const values = [example.trigger, example.condition, example.action, example.approval, example.result];

  return (
    <SectionCard title="Workflow builder preview" description="UI-only — no drag-and-drop">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex-1 min-w-[180px] rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-xs font-bold uppercase text-emerald-800">{stage}</p>
            <p className="mt-2 text-sm text-slate-800">{values[i]}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
