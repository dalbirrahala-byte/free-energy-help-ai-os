export default function ExecutiveIntelligenceDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
