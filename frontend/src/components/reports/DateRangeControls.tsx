"use client";

import { DATE_RANGE_OPTIONS } from "@/lib/reports/constants";
import type { DateRangeOption } from "@/lib/reports/types";

type DateRangeControlsProps = {
  value: DateRangeOption;
  onChange: (range: DateRangeOption) => void;
};

export function DateRangeControls({ value, onChange }: DateRangeControlsProps) {
  return (
    <section
      aria-labelledby="date-range-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 id="date-range-heading" className="text-sm font-bold text-slate-900">
        Date range
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={option === "Custom range"}
            title={option === "Custom range" ? "Not configured" : undefined}
            onClick={() => option !== "Custom range" && onChange(option)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              value === option
                ? "bg-emerald-500 text-white"
                : option === "Custom range"
                  ? "cursor-not-allowed border border-dashed border-slate-200 text-slate-400"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {option === "Custom range" ? `${option} — Not configured` : option}
          </button>
        ))}
      </div>
    </section>
  );
}
