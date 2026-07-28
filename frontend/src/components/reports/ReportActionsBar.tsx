import { REPORT_ACTIONS } from "@/lib/reports/constants";

export function ReportActionsBar() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Report actions</h2>
      <p className="mt-1 text-sm text-slate-500">UI-only phase — exports and scheduling not configured.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {REPORT_ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
            title="Not configured"
          >
            {label} — Not configured
          </button>
        ))}
      </div>
    </section>
  );
}
