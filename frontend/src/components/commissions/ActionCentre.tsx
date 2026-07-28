"use client";

type ActionCentreProps = {
  onRefresh: () => void;
};

export function ActionCentre({ onRefresh }: ActionCentreProps) {
  return (
    <section
      aria-labelledby="action-centre-heading"
      className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"
    >
      <h2 id="action-centre-heading" className="text-lg font-bold">
        Action centre
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Demo actions — live workflows Not configured.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <ActionButton disabled label="Review Disputes" reason="Not configured" />
        <ActionButton disabled label="Send Supplier Chase" reason="Not configured" />
        <ActionButton disabled label="Export Commission Report" reason="Not configured" />
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Refresh Dashboard
        </button>
      </div>
    </section>
  );
}

function ActionButton({
  label,
  disabled,
  reason,
}: {
  label: string;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={reason}
      className="cursor-not-allowed rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-400"
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}
