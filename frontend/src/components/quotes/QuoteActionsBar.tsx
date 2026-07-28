import { DEMO_ACTIONS } from "@/lib/quotes/constants";

export function QuoteActionsBar() {
  return (
    <section
      aria-labelledby="quote-actions-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="quote-actions-heading" className="text-lg font-bold text-slate-900">
        Actions
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Buttons disabled in demonstration mode — no PDF, email, or supplier connectivity.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {DEMO_ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            title="Demo mode — action not available"
            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
