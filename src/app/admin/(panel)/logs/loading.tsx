export default function AdminLogsLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 animate-pulse">
      {/* Header + search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-8 w-32 rounded bg-white/10 mb-2" />
          <div className="h-4 w-72 rounded bg-white/10" />
        </div>
        <div className="h-11 w-full md:w-[360px] rounded-xl bg-white/10" />
      </div>

      {/* Card container */}
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[#111214] p-4">
        {/* Count + page row */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
        </div>

        {/* Log rows */}
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2">
              <div className="h-10 w-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 w-36 rounded bg-white/10" />
                <div className="h-3 w-24 rounded bg-white/10" />
              </div>
              <div className="h-4 w-12 rounded bg-white/10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
