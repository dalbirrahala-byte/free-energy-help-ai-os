type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
};

export function StatCard({ title, value, hint }: StatCardProps) {
  const isNotConfigured = value === "Not configured";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${
          isNotConfigured ? "text-base text-slate-400" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>
      )}
    </div>
  );
}
