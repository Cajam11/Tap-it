export default function AdminDashboardLoading() {
  return (
    <section className="space-y-8 pb-20 animate-pulse">
      {/* Back Link Skeleton */}
      <div className="pt-2">
        <div className="h-4 w-32 rounded bg-white/10" />
      </div>

      {/* Main Cards - Live Occupancy & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-48 rounded bg-white/10" />
            <div className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <div className="h-32 w-full rounded-2xl bg-white/10" />
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="h-6 w-40 rounded bg-white/10 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-3 w-32 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Check In / Logs View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="mb-6">
            <div className="h-7 w-56 rounded bg-white/10 mb-2" />
            <div className="h-4 w-96 rounded bg-white/10" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded bg-white/10" />
                    <div className="h-3 w-24 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </article>

        {/* Sidebar Widget */}
        <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="h-6 w-32 rounded bg-white/10 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/10" />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
