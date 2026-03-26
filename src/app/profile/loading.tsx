export default function ProfileLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-8 animate-pulse">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex flex-col items-center gap-4 lg:items-start">
              <div className="h-32 w-32 rounded-full bg-white/10" />
              <div className="h-3 w-32 rounded bg-white/10" />
              <div className="h-7 w-36 rounded-full bg-white/10" />
            </div>
            <div className="space-y-4">
              <div className="h-3 w-20 rounded bg-white/10" />
              <div className="h-10 w-64 rounded bg-white/10" />
              <div className="h-4 w-56 rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-5/6 rounded bg-white/10" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="h-4 w-28 rounded bg-white/10" />
              <div className="mt-4 h-9 w-16 rounded bg-white/10" />
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 h-6 w-28 rounded bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="h-4 w-24 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-full rounded bg-white/10" />
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 h-6 w-24 rounded bg-white/10" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-5/6 rounded bg-white/10" />
              <div className="h-4 w-4/6 rounded bg-white/10" />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
