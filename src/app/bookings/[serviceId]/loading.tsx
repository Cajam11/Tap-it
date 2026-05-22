export default function ServiceDetailLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-12 animate-pulse">
        <div className="mb-2 h-3 w-32 rounded-full bg-white/10" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="group relative flex min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-white/[0.05] to-white/[0.03]" />
              <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
              <div className="relative mt-auto p-6">
                <div className="h-9 w-60 rounded-2xl bg-white/10" />
                <div className="mt-3 h-4 w-full max-w-sm rounded-full bg-white/6" />
                <div className="mt-2 h-4 w-2/3 rounded-full bg-white/6" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
              <div className="h-4 w-32 rounded-full bg-white/10" />
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-4 w-20 rounded-full bg-white/6" />
                  <div className="h-4 w-36 rounded-full bg-white/10" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="h-4 w-20 rounded-full bg-white/6" />
                  <div className="h-4 w-24 rounded-full bg-white/10" />
                </div>
                <div className="h-px w-full bg-white/10" />
                <div className="flex items-center justify-between gap-4">
                  <div className="h-5 w-16 rounded-full bg-white/10" />
                  <div className="h-5 w-24 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
              <div className="flex items-center justify-between mb-8">
                <div className="h-8 w-56 rounded-2xl bg-white/10" />
                <div className="h-8 w-28 rounded-full bg-white/10" />
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-5 w-24 rounded-full bg-white/10" />
                  <div className="h-5 w-32 rounded-full bg-white/10" />
                </div>
                <div className="mt-3 h-4 w-44 rounded-full bg-white/6" />
                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-24 rounded-full bg-white/10" />
                    <div className="h-6 w-20 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
                <div className="space-y-4">
                  <div className="h-4 w-44 rounded-full bg-white/10" />
                  <div className="h-12 w-full rounded-xl bg-white/6" />
                </div>
                <div className="mt-6 h-12 w-full rounded-xl bg-red-600/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}