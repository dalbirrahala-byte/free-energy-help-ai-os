export default function RenewalIntelligenceLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
