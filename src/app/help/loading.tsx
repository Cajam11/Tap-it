export default function HelpLoading() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8 animate-pulse">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="h-9 w-64 rounded bg-white/10" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-white/10" />
        </section>

        {Array.from({ length: 4 }).map((_, sectionIndex) => (
          <section
            key={sectionIndex}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
          >
            <div className="h-8 w-48 rounded bg-white/10" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <div key={itemIndex} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="h-5 w-4/5 rounded bg-white/10" />
                  <div className="mt-3 h-4 w-full rounded bg-white/10" />
                  <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="h-8 w-52 rounded bg-white/10" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-white/10" />
          <div className="mt-6 space-y-4">
            <div className="h-10 w-full rounded-lg bg-white/10" />
            <div className="h-10 w-full rounded-lg bg-white/10" />
            <div className="h-28 w-full rounded-lg bg-white/10" />
            <div className="h-10 w-32 rounded-full bg-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}
