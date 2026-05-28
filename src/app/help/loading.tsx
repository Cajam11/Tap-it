export default function HelpLoading() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-12 animate-pulse">
        {/* Header */}
        <section className="flex flex-col items-center text-center">
          <div className="mb-6 h-7 w-20 rounded-full bg-white/10" />
          <div className="h-12 w-96 max-w-full rounded-xl bg-white/10 sm:h-14" />
          <div className="mt-5 h-4 w-72 max-w-full rounded bg-white/10" />
          <div className="mt-2 h-4 w-56 max-w-full rounded bg-white/10" />
        </section>

        {/* FAQ sections */}
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section key={sectionIndex} className="space-y-3">
            <div className="mb-4 h-3 w-28 rounded bg-white/10" />
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:px-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="h-5 w-3/4 rounded bg-white/10" />
                  <div className="h-5 w-5 shrink-0 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </section>
        ))}

        {/* Contact form */}
        <section className="border-t border-white/10 pt-8 sm:pt-10">
          <div className="h-8 w-48 rounded-xl bg-white/10" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-white/10" />
          <div className="mt-8 space-y-5">
            <div className="space-y-2.5">
              <div className="h-4 w-12 rounded bg-white/10" />
              <div className="h-12 w-full rounded-xl bg-white/10" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="h-12 w-full rounded-xl bg-white/10" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="h-32 w-full rounded-xl bg-white/10" />
            </div>
            <div className="flex justify-center">
              <div className="h-12 w-28 rounded-full bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
