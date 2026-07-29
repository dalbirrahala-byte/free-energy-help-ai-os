export function EnterpriseActionsBar() {
  const actions = ["Approve recommendation", "Reject", "Defer", "Re-run evaluation", "Export audit (demo)"];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((label) => (
          <button key={label} type="button" disabled className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
            {label} — Not configured
          </button>
        ))}
      </div>
    </section>
  );
}
