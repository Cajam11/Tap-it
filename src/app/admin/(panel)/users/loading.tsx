export default function AdminUsersLoading() {
  return (
    <section className="space-y-5 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-32 rounded bg-white/10 mb-2" />
        <div className="h-4 w-96 rounded bg-white/10" />
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="h-3 w-16 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-12 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-14 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-20 rounded bg-white/10 mb-2" />
          <div className="h-10 w-full rounded-lg bg-white/10" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <div className="h-10 w-24 rounded-lg bg-white/10" />
          <div className="h-10 w-20 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Count Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="h-5 w-48 rounded bg-white/10" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3"><div className="h-4 w-16 rounded bg-white/10" /></th>
              <th className="px-4 py-3"><div className="h-4 w-20 rounded bg-white/10" /></th>
              <th className="px-4 py-3"><div className="h-4 w-12 rounded bg-white/10" /></th>
              <th className="px-4 py-3"><div className="h-4 w-24 rounded bg-white/10" /></th>
              <th className="px-4 py-3"><div className="h-4 w-20 rounded bg-white/10" /></th>
              <th className="px-4 py-3"><div className="h-4 w-16 rounded bg-white/10" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-white/10 last:border-b-0">
                <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-white/10" /></td>
                <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-white/10" /></td>
                <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-white/10" /></td>
                <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-white/10" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-white/10" /></td>
                <td className="px-4 py-3"><div className="h-8 w-20 rounded-lg bg-white/10" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
