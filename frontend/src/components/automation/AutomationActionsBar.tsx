import { AUTOMATION_ACTIONS } from "@/lib/automation/constants";

export function AutomationActionsBar() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {AUTOMATION_ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
          >
            {label} — Not configured
          </button>
        ))}
      </div>
    </section>
  );
}
