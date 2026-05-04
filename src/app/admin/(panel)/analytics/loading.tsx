export default function AdminAnalyticsLoading() {
  return (
    <section className="space-y-8 pb-20 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-40 rounded bg-white/10 mb-2" />
        <div className="h-4 w-96 rounded bg-white/10" />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="h-5 w-24 rounded bg-white/10" />
              <div className="h-8 w-8 rounded bg-white/10" />
            </div>
            <div className="h-8 w-32 rounded bg-white/10 mb-2" />
            <div className="h-3 w-28 rounded bg-white/10" />
          </article>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6">
            <div className="h-6 w-48 rounded bg-white/10 mb-2" />
            <div className="h-4 w-64 rounded bg-white/10" />
          </div>
          <div className="h-64 w-full rounded-lg bg-white/10" />
        </article>

        {/* Bar Chart */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6">
            <div className="h-6 w-40 rounded bg-white/10 mb-2" />
            <div className="h-4 w-56 rounded bg-white/10" />
          </div>
          <div className="h-64 w-full rounded-lg bg-white/10" />
        </article>
      </div>

      {/* Top Activities List */}
      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6">
          <div className="h-6 w-48 rounded bg-white/10 mb-2" />
          <div className="h-4 w-64 rounded bg-white/10" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="h-3 w-24 rounded bg-white/10" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-5 w-20 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
