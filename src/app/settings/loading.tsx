export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 min-h-screen mt-20">
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-10 w-56 rounded bg-white/10" />
            <div className="h-4 w-96 max-w-full rounded bg-white/10" />
          </div>
          <div className="h-10 w-28 rounded-full bg-white/10" />
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
          <div className="mb-4 h-4 w-20 rounded bg-white/10" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-white/10" />
            <div className="space-y-3 w-full">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="h-5 w-64 max-w-full rounded bg-white/10" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 h-4 w-28 rounded bg-white/10" />
          <div className="space-y-4">
            <div className="h-28 w-full rounded-xl bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-12 w-full rounded-xl bg-white/10" />
              <div className="h-12 w-full rounded-xl bg-white/10" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 h-4 w-24 rounded bg-white/10" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-white/10" />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 h-4 w-20 rounded bg-white/10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-3 w-36 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/10" />
              <div className="h-6 w-40 rounded bg-white/10 mx-auto sm:mx-0" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-10 rounded-xl bg-white/10" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
