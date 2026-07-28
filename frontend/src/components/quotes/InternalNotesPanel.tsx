import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoInternalNote } from "@/lib/quotes/types";

type InternalNotesPanelProps = {
  notes: DemoInternalNote[];
};

export function InternalNotesPanel({ notes }: InternalNotesPanelProps) {
  return (
    <SectionCard title="Internal notes" description="Comments and attachments — demo only">
      <ul className="space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">{note.author}</span>
              <time className="text-slate-500">{note.createdAt}</time>
            </div>
            <p className="mt-2 text-sm text-slate-700">{note.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
        Attachments — Not configured (demo placeholder)
      </div>
    </SectionCard>
  );
}
