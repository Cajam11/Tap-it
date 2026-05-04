export default function AdminUserDetailLoading() {
  return (
    <section className="space-y-8 pb-20 max-w-6xl mx-auto relative animate-pulse">
      {/* Background Blurs */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px] -z-10" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px] -z-10" />

      {/* Back Link Skeleton */}
      <div className="pt-2">
        <div className="h-4 w-40 rounded bg-white/10" />
      </div>

      {/* Main Profile Card */}
      <article className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 mt-4">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <div className="h-32 w-32 rounded-full border border-white/15 bg-white/10" />
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-8 w-28 rounded-full border border-white/15 bg-white/10" />
          </div>

          <div>
            <div className="h-3 w-40 rounded bg-white/10 mb-3" />
            <div className="h-10 w-64 rounded bg-white/10 mb-3" />
            <div className="h-4 w-48 rounded bg-white/10 mb-8" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="h-3 w-20 rounded bg-white/10 mb-2" />
                  <div className="h-5 w-24 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* History Card */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[400px]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-white/10" />
              <div className="h-5 w-40 rounded bg-white/10" />
              <div className="h-6 w-12 rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-white/10" />
          </div>

          <div className="flex-1 space-y-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 rounded bg-white/10" />
                    <div className="h-3 w-40 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </article>

        {/* Transactions Card */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[400px]">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-white/10" />
            <div className="h-5 w-48 rounded bg-white/10" />
            <div className="h-6 w-12 rounded-full bg-white/10" />
          </div>

          <div className="flex-1 space-y-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded bg-white/10" />
                    <div className="h-3 w-40 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
