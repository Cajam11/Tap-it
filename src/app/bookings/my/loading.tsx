export default function MyBookingsLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-8 animate-pulse">
        <header className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-12 w-full max-w-md rounded-3xl bg-white/10" />
          <div className="h-4 w-full max-w-2xl rounded-full bg-white/6" />
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.9fr)]">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-2">
                <div className="h-6 w-44 rounded bg-white/10" />
                <div className="h-4 w-36 rounded bg-white/6" />
              </div>
              <div className="h-8 w-20 rounded-full bg-white/10" />
            </div>

            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-5 w-64 max-w-full rounded bg-white/10" />
                      <div className="h-4 w-40 rounded bg-white/6" />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-7 w-24 rounded-full bg-white/10" />
                      <div className="h-5 w-16 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-2">
                <div className="h-6 w-40 rounded bg-white/10" />
                <div className="h-4 w-52 rounded bg-white/6" />
              </div>
              <div className="h-8 w-20 rounded-full bg-white/10" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-2xl bg-white/8" />
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="h-4 w-36 rounded bg-white/10" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-full rounded bg-white/6" />
                  <div className="h-4 w-5/6 rounded bg-white/6" />
                  <div className="h-4 w-2/3 rounded bg-white/6" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}