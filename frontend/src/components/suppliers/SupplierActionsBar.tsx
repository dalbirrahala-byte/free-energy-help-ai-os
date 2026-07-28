import Link from "next/link";

import type { DemoSupplierRecord } from "@/lib/suppliers/types";

export function SupplierActionsBar({
  supplier,
  onView,
  onCompare,
}: {
  supplier: DemoSupplierRecord | null;
  onView: () => void;
  onCompare: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!supplier}
          onClick={onView}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          View supplier
        </button>
        <button
          type="button"
          disabled={!supplier}
          onClick={onCompare}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Compare supplier
        </button>
        <Disabled label="Add internal note" />
        <Disabled label="Schedule review" />
        <Link href="/commissions" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          Open commission records
        </Link>
        <Link href="/quotes" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          View related quotes
        </Link>
        <Link href="/contracts" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          View related contracts
        </Link>
        <Disabled label="Export supplier report" />
      </div>
    </section>
  );
}

function Disabled({ label }: { label: string }) {
  return (
    <span className="rounded-xl border border-dashed border-slate-200 px-4 py-2 text-sm text-slate-400">
      {label} — Not configured
    </span>
  );
}
