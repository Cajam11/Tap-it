export default function AdminBookingsLoading() {
  return (
    <section className="animate-pulse p-4 sm:p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="h-8 w-56 rounded bg-white/10 mb-2" />
          <div className="h-4 w-80 rounded bg-white/10" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="h-9 w-28 rounded-lg bg-white/10" />
          <div className="h-9 w-36 rounded-lg bg-white/10" />
          <div className="h-9 w-28 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Calendar nav row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/10" />
          <div className="h-6 w-36 rounded bg-white/10" />
          <div className="h-9 w-9 rounded-lg bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 rounded-lg bg-white/10" />
          <div className="h-8 w-16 rounded-lg bg-white/10" />
          <div className="h-8 w-16 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.03]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-3 py-3 flex justify-center">
              <div className="h-4 w-8 rounded bg-white/10" />
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-white/10 last:border-b-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="border-r border-white/10 last:border-r-0 p-1 sm:p-2 min-h-[68px] sm:min-h-[100px]">
                <div className="h-5 w-5 rounded-full bg-white/10 mb-2" />
                {week === 1 && day % 3 === 0 && (
                  <div className="h-6 w-full rounded bg-white/10 mb-1" />
                )}
                {week === 2 && day % 2 === 0 && (
                  <>
                    <div className="h-6 w-full rounded bg-white/10 mb-1" />
                    <div className="h-6 w-3/4 rounded bg-white/10" />
                  </>
                )}
                {week === 3 && day % 4 === 1 && (
                  <div className="h-6 w-full rounded bg-white/10" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
