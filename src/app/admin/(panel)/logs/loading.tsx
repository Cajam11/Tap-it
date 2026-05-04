export default function AdminLogsLoading() {
  return (
    <section className="space-y-5 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-36 rounded bg-white/10 mb-2" />
        <div className="h-4 w-96 rounded bg-white/10" />
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="h-3 w-16 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-12 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <div className="h-10 w-24 rounded-lg bg-white/10" />
          <div className="h-10 w-20 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Count Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="h-5 w-48 rounded bg-white/10" />
      </div>

      {/* Logs List */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="space-y-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-white/10 last:border-b-0 px-4 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-lg bg-white/10 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 rounded bg-white/10" />
                  <div className="h-3 w-64 rounded bg-white/10" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="h-6 w-20 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
