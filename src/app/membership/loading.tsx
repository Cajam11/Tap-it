export default function MembershipLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8 animate-pulse">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="h-24 w-24 rounded-full border border-white/15 bg-white/10" />

            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-10 w-56 rounded bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/10" />
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="h-4 w-64 rounded bg-white/10" />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="h-7 w-44 rounded bg-white/10" />
          <div className="mt-3 h-4 w-72 rounded bg-white/10" />

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-stretch">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={index}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-6 w-24 rounded bg-white/10" />
                  <div className="h-6 w-16 rounded-full bg-white/10" />
                </div>

                <div className="mt-4 h-9 w-20 rounded bg-white/10" />
                <div className="mt-2 h-4 w-16 rounded bg-white/10" />

                <div className="mt-5 space-y-2">
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-5/6 rounded bg-white/10" />
                  <div className="h-3 w-4/6 rounded bg-white/10" />
                </div>

                <div className="mt-auto pt-6">
                  <div className="h-10 w-full rounded-full bg-white/10" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
            <div className="flex h-56 w-56 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
              <div className="h-44 w-44 rounded-2xl border border-dashed border-white/10 bg-white/[0.04]" />
            </div>

            <div className="w-full space-y-4">
              <div className="h-7 w-40 rounded bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="h-12 w-48 rounded-full bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
