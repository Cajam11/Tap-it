export default function TransactionsLoading() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8 animate-pulse">
        {/* Hlavička */}
        <div>
          <div className="h-9 w-64 bg-white/10 rounded-lg mb-3"></div>
          <div className="h-5 w-96 bg-white/5 rounded-lg max-w-full"></div>
        </div>

        {/* Tabuľka (Skeleton) */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-5">
                    <div className="h-4 w-20 bg-white/10 rounded"></div>
                  </th>
                  <th className="px-6 py-5">
                    <div className="h-4 w-32 bg-white/10 rounded"></div>
                  </th>
                  <th className="px-6 py-5">
                    <div className="h-4 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="px-6 py-5">
                    <div className="h-4 w-24 bg-white/10 rounded"></div>
                  </th>
                  <th className="px-6 py-5 flex justify-end">
                    <div className="h-4 w-16 bg-white/10 rounded"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-5">
                      <div className="h-4 w-32 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-40 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-6 w-20 bg-white/5 rounded-full"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-24 bg-white/5 rounded"></div>
                    </td>
                    <td className="px-6 py-5 flex justify-end">
                      <div className="h-4 w-20 bg-white/5 rounded"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
