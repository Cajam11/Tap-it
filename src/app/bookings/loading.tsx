export default function BookingsLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-12%] top-[-16%] h-[34rem] w-[34rem] rounded-full bg-red-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-12%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-red-900/15 blur-[180px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-14 lg:space-y-16 animate-pulse">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-3xl space-y-5 pt-4 lg:pt-8">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="h-14 w-full max-w-2xl rounded-3xl bg-white/10 sm:h-16 lg:h-20" />
            <div className="space-y-3">
              <div className="h-4 w-full max-w-2xl rounded-full bg-white/6" />
              <div className="h-4 w-3/4 rounded-full bg-white/6" />
            </div>
          </div>

          <div className="h-11 w-44 rounded-full border border-white/10 bg-white/5" />
        </div>

        <section className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <article
              key={index}
              className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"
            >
              <div className="flex min-h-[20rem] flex-col items-center px-5 pb-6 pt-8 sm:px-6">
                <div className="h-24 w-24 rounded-full bg-white/10 sm:h-28 sm:w-28" />
                <div className="mt-7 flex w-full flex-1 flex-col items-center text-center">
                  <div className="h-7 w-32 rounded-full bg-white/10 sm:h-8 sm:w-36" />
                  <div className="mt-3 h-4 w-full max-w-[14rem] rounded-full bg-white/6" />
                  <div className="mt-2 h-4 w-2/3 max-w-[10rem] rounded-full bg-white/6" />
                  <div className="mt-auto w-full pt-8">
                    <div className="mx-auto h-12 w-full max-w-[10rem] rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}