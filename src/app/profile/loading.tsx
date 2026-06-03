export default function ProfileLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8 animate-pulse">

        {/* Profile header */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="h-24 w-24 shrink-0 rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="h-9 w-52 rounded bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/10" />
            </div>
          </div>
        </section>

        {/* Detaily */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/10" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 h-3 w-8 rounded bg-white/10" />
                <div className="h-10 w-full rounded-2xl bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 h-3 w-20 rounded bg-white/10" />
                  <div className="h-10 w-full rounded-2xl bg-white/10" />
                </div>
                <div>
                  <div className="mb-1 h-3 w-14 rounded bg-white/10" />
                  <div className="h-10 w-full rounded-2xl bg-white/10" />
                </div>
              </div>
              <div>
                <div className="mb-1 h-3 w-24 rounded bg-white/10" />
                <div className="h-10 w-full rounded-2xl bg-white/10" />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 h-3 w-28 rounded bg-white/10" />
                <div className="h-10 w-full rounded-2xl bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 h-3 w-16 rounded bg-white/10" />
                  <div className="h-10 w-full rounded-2xl bg-white/10" />
                </div>
                <div>
                  <div className="mb-1 h-3 w-14 rounded bg-white/10" />
                  <div className="h-10 w-full rounded-2xl bg-white/10" />
                </div>
              </div>
              <div>
                <div className="mb-1 h-3 w-12 rounded bg-white/10" />
                <div className="h-10 w-full rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </section>

        {/* Odznaky + Aktivita */}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-white/10" />
              <div className="h-4 w-16 rounded bg-white/10" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <div className="h-3 w-24 rounded bg-white/10" />
                  <div className="mt-1.5 h-3 w-full rounded bg-white/10" />
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-white/10" />
              <div className="h-4 w-14 rounded bg-white/10" />
            </div>
            <div className="space-y-3">
              <div className="h-3 w-full rounded bg-white/10" />
              <div className="h-3 w-5/6 rounded bg-white/10" />
              <div className="h-3 w-4/6 rounded bg-white/10" />
            </div>
          </article>
        </div>

      </div>
    </main>
  );
}
