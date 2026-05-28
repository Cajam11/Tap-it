export default function CheckoutLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl pt-6 animate-pulse">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/35 mb-6">
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16 items-stretch">
          <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white">
            <div className="relative min-h-[24rem] flex-grow">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-white/[0.05] to-white/[0.03]" />
              <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 z-10 sm:p-8">
                <div className="h-8 w-56 rounded-xl bg-white/10 mb-3" />
                <div className="h-4 w-3/4 rounded-full bg-white/5" />
                <div className="h-4 w-1/2 rounded-full bg-white/5 mt-2" />
              </div>
            </div>

            <div className="shrink-0 border-t border-white/5 bg-[#0d0d0d]/80 p-6 backdrop-blur-xl sm:p-8">
              <div className="h-4 w-36 bg-white/10 rounded mb-4" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-white/5" />
                  <div className="h-4 w-32 rounded bg-white/10" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 rounded bg-white/5" />
                  <div className="flex flex-col items-end gap-2">
                    <div className="h-4 w-24 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-px w-full bg-white/10" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 rounded bg-white/10" />
                  <div className="h-5 w-28 rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md sm:p-8">
            <div className="h-8 w-40 rounded-xl bg-white/10 mb-8" />
            
            <div className="space-y-4">
               <div className="h-14 w-full rounded-2xl bg-white/5" />
               <div className="h-14 w-full rounded-2xl bg-white/5" />
               <div className="h-14 w-full rounded-2xl bg-white/5" />
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
              <div className="h-12 w-full rounded-xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}