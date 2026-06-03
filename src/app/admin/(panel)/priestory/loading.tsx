export default function AdminFacilitiesLoading() {
  return (
    <div className="p-8">
      <div className="mb-8 h-10 w-56 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="h-96 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-96 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
