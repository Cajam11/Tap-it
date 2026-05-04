export default function LegalDocumentLoading() {
  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#080808] text-white">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8 animate-pulse border-b border-white/10 pb-8">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mt-4 h-11 w-full max-w-2xl rounded bg-white/10 sm:h-14" />
          <div className="mt-4 h-6 w-full max-w-xl rounded bg-white/10" />
          <div className="mt-6 h-4 w-40 rounded bg-white/10" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-12 lg:flex-row lg:gap-24">
          <aside className="w-full shrink-0 flex-col gap-8 overflow-y-auto pb-8 pt-2 lg:flex lg:w-72">
            <div className="space-y-5 animate-pulse">
              <div className="h-3 w-32 rounded bg-white/10" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-4 w-full rounded bg-white/10" />
                ))}
              </div>
            </div>

            <div className="hidden border-t border-white/10 pt-8 lg:flex lg:flex-col lg:gap-6 animate-pulse">
              <div className="h-11 w-40 rounded-full bg-white/10" />
              <div className="space-y-3">
                <div className="h-4 w-44 rounded bg-white/10" />
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-4 w-36 rounded bg-white/10" />
              </div>
            </div>
          </aside>

          <div className="flex-1 overflow-y-auto pb-20 pt-2 pr-4">
            <div className="max-w-3xl space-y-12 animate-pulse">
              {Array.from({ length: 5 }).map((_, sectionIndex) => (
                <section
                  key={sectionIndex}
                  className="border-b border-white/5 pb-10 last:border-0"
                >
                  <div className="h-8 w-2/3 rounded bg-white/10" />
                  <div className="mt-6 space-y-4">
                    <div className="h-4 w-full rounded bg-white/10" />
                    <div className="h-4 w-[92%] rounded bg-white/10" />
                    <div className="h-4 w-[86%] rounded bg-white/10" />
                    <div className="h-4 w-[78%] rounded bg-white/10" />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
