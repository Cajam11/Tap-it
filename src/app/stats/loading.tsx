export default function StatsLoading() {
  return (
    <main className="relative h-screen overflow-hidden bg-[#080808] px-4 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col pb-4">
        {/* Header skeleton (open) */}
        <div className="mb-5 shrink-0">
          <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
          <div className="h-12 bg-white/10 rounded w-64 mt-3 animate-pulse" />
          <div className="h-4 bg-white/5 rounded w-80 mt-3 animate-pulse" />
        </div>

        {/* Stats cards skeleton */}
        <div className="mb-5 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 h-24 animate-pulse"
            />
          ))}
        </div>

        {/* Two column layout skeleton (left column contains calendar + badges) */}
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-3 lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-1">
            <div className="h-64 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 animate-pulse" />

            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="mb-4 h-4 w-24 shrink-0 rounded bg-white/10 animate-pulse" />
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 h-20 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-6 lg:col-span-2">
            <div className="h-48 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 animate-pulse" />
            <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-5 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
