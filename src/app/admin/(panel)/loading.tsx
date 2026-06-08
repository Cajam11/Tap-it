export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col md:h-full gap-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded bg-white/10" />
          <div className="h-4 w-64 rounded bg-white/10" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 rounded-lg bg-white/10" />
          <div className="h-9 w-28 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[0.05] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-white/10" />
              <div className="h-5 w-16 rounded-full bg-white/10" />
            </div>
            <div className="h-10 w-20 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 md:flex-1 md:min-h-0">
        {/* Visit Trend */}
        <div className="lg:col-span-2 flex h-[360px] flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:h-full">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-white/10" />
              <div className="h-3 w-24 rounded bg-white/10" />
            </div>
            <div className="h-8 w-24 rounded bg-white/10" />
          </div>
          <div className="flex-1 rounded-2xl bg-white/[0.04]" />
        </div>

        {/* Logs */}
        <div className="flex h-[440px] flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-6 md:h-full">
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-white/10" />
              <div className="h-3 w-20 rounded bg-white/10" />
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 space-y-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-white/10" />
                  <div className="h-2.5 w-20 rounded bg-white/10" />
                </div>
                <div className="h-3 w-10 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
