export default function CheckoutLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-xl space-y-8 animate-pulse">
        <div className="h-10 w-80 rounded-3xl bg-white/10" />

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
          <div className="h-4 w-24 rounded-full bg-white/10" />
          <div className="h-7 w-56 rounded-2xl bg-white/10" />
          <div className="h-4 w-full max-w-md rounded-full bg-white/6" />
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded-full bg-white/10" />
              <div className="h-6 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-red-500/10 p-4">
          <div className="h-4 w-64 rounded-full bg-white/10" />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
          <div className="space-y-4">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-14 w-full rounded-2xl bg-white/6" />
            <div className="h-14 w-full rounded-2xl bg-white/6" />
          </div>
        </div>
      </div>
    </main>
  );
}