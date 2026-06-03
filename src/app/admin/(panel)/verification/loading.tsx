export default function AdminVerificationLoading() {
  return (
    <section className="space-y-5 animate-pulse p-6">
      {/* Header */}
      <div>
        <div className="h-8 w-48 rounded bg-white/10 mb-2" />
        <div className="h-4 w-80 rounded bg-white/10" />
      </div>

      {/* Search bar */}
      <div className="h-11 w-full max-w-md rounded-xl bg-white/10" />

      {/* User queue list */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-white/10 last:border-b-0 px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="h-3 w-56 rounded bg-white/10" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-8 w-24 rounded-lg bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
