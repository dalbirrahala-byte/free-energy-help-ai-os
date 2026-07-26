export default function LeadsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
            <p className="mt-1 text-slate-500">
              Manage new enquiries and live transfer leads.
            </p>
          </div>

          <button className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600">
            Add Lead
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Lead Management</h2>

          <p className="mt-2 text-sm text-slate-500">
            Your customer leads will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}
