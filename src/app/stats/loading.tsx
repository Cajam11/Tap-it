export default function StatsLoading() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#080808] px-4 pb-8 pt-28 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-[-10%] h-[520px] w-[520px] translate-y-1/2 rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4 animate-pulse">
        {/* Header skeleton */}
        <div>
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mt-2 h-12 w-64 rounded bg-white/10" />
          <div className="mt-2 h-4 w-80 max-w-full rounded bg-white/5" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>

        {/* Calendar + badges / charts grid */}
        <div className="grid gap-6 lg:gap-x-6 lg:gap-y-4 lg:grid-cols-3 lg:grid-rows-[300px_320px] lg:items-stretch">
          {/* Left column: calendar + badges */}
          <div className="flex flex-col gap-4 lg:col-span-1 lg:row-span-2 lg:row-start-1">
            <div className="h-56 rounded-3xl border border-white/10 bg-white/[0.03]" />

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-3 h-3 w-24 rounded bg-white/10" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[72px] rounded-md border border-white/10 bg-white/[0.02] sm:h-[78px]"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Workout trends chart */}
          <div className="lg:col-span-2 lg:col-start-2 lg:row-start-1">
            <div className="h-[300px] rounded-2xl border border-white/10 bg-white/[0.02]" />
          </div>

          {/* Weight chart */}
          <div className="lg:col-span-2 lg:col-start-2 lg:row-start-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:p-6">
              <div className="mb-3 h-3 w-24 rounded bg-white/10 sm:mb-4" />
              <div className="h-[180px] rounded bg-white/[0.04] sm:h-52 lg:h-56" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
