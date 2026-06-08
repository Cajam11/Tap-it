export default function AdminShiftsLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded bg-white/10" />
          <div className="h-4 w-72 rounded bg-white/10" />
        </div>
        <div className="h-10 w-40 rounded-lg bg-white/10" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="h-16 border-b border-white/10" />
          <div className="grid grid-cols-7 gap-px p-px">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="h-24 bg-white/[0.04]" />
            ))}
          </div>
        </div>
        <div className="h-[36rem] rounded-xl border border-white/10 bg-white/[0.03]" />
      </div>
    </div>
  );
}
