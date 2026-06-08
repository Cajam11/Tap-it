export default function AdminNewsLoading() {
  return (
    <section className="space-y-5 animate-pulse p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="h-8 w-52 rounded bg-white/10" />
        <div className="h-10 w-28 rounded-lg bg-white/10" />
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <div className="h-14 w-20 shrink-0 rounded bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="h-3 w-28 rounded bg-white/10" />
                <div className="h-3 w-24 rounded bg-white/10" />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/10" />
              <div className="h-8 w-8 rounded-lg bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03]">
            <tr>
              <th className="px-6 py-4"><div className="h-4 w-12 rounded bg-white/10" /></th>
              <th className="px-6 py-4"><div className="h-4 w-16 rounded bg-white/10" /></th>
              <th className="px-6 py-4"><div className="h-4 w-24 rounded bg-white/10" /></th>
              <th className="px-6 py-4"><div className="h-4 w-24 rounded bg-white/10" /></th>
              <th className="px-6 py-4 text-right"><div className="h-4 w-16 rounded bg-white/10 ml-auto" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-white/10 last:border-b-0">
                <td className="px-6 py-4">
                  <div className="w-16 h-12 rounded bg-white/10" />
                </td>
                <td className="px-6 py-4"><div className="h-4 w-48 rounded bg-white/10" /></td>
                <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-white/10" /></td>
                <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-white/10" /></td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10" />
                    <div className="h-8 w-8 rounded-lg bg-white/10" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
