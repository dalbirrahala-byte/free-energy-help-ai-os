export default function SupplierRegistryLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
