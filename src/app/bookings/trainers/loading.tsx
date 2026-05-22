export default function TrainersLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-12%] top-[-14%] h-[32rem] w-[32rem] rounded-full bg-red-600/18 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-amber-500/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[-18%] right-[-14%] h-[34rem] w-[34rem] rounded-full bg-red-900/15 blur-[180px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-12 lg:space-y-14 animate-pulse">
        <div className="flex flex-col gap-6 pt-4 lg:pt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="h-3 w-28 rounded-full bg-white/10" />
          </div>

          <div className="max-w-3xl space-y-5">
            <div className="h-14 w-full max-w-2xl rounded-3xl bg-white/10 sm:h-16 lg:h-20" />
            <div className="space-y-3">
              <div className="h-4 w-full max-w-2xl rounded-full bg-white/6" />
              <div className="h-4 w-3/4 rounded-full bg-white/6" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-48 rounded-full border border-white/10 bg-white/5" />
            <div className="h-px w-16 bg-white/15" />
            <div className="h-4 w-56 rounded-full bg-white/6" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={index}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]"
            >
              <div className="min-h-[24rem] bg-gradient-to-b from-white/[0.08] via-white/[0.05] to-white/[0.03]" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/40 px-4 py-4 backdrop-blur-md">
                  <div className="mx-auto h-6 w-28 rounded bg-white/10" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}