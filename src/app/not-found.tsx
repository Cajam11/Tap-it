import Link from "next/link";
import { Home, Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-4">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <Dumbbell className="h-9 w-9 text-red-400" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">CHYBA 404</p>
          <h1 className="mt-2 text-5xl font-black text-white sm:text-6xl">
            Nenájdené
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/50">
            Táto stránka neexistuje alebo bola presunutá. Skontroluj adresu a skús to znova.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500/50 hover:bg-white/[0.08]"
        >
          <Home className="h-4 w-4" />
          Späť domov
        </Link>
      </div>
    </main>
  );
}
