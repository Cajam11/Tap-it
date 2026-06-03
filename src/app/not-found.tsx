import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4">
      {/* Abstract metallic blob behind the content */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[620px] w-[620px] sm:h-[760px] sm:w-[760px]">
          {/* Metallic base mass */}
          <div className="absolute inset-0 rounded-[45%] bg-gradient-to-br from-white/10 via-zinc-700/25 to-black blur-[80px]" />
          {/* Red streaks */}
          <div className="absolute left-1/2 top-1/2 h-44 w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full bg-gradient-to-r from-transparent via-red-600/55 to-transparent blur-[60px]" />
          <div className="absolute left-1/2 top-[62%] h-28 w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-full bg-gradient-to-r from-transparent via-red-500/35 to-transparent blur-[70px]" />
          {/* Cool highlight */}
          <div className="absolute right-1/4 top-1/4 h-52 w-52 rounded-full bg-white/15 blur-[90px]" />
        </div>
      </div>

      {/* Vignette to fade the blob into the black edges */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000_75%)]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Brand pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 backdrop-blur">
          <Dumbbell className="h-3.5 w-3.5 text-red-400" />
          <span className="text-sm font-semibold text-white">Tap-it</span>
        </div>

        {/* Glassmorphic 404 */}
        <h1 className="select-none bg-gradient-to-b from-white/25 to-white/[0.06] bg-clip-text text-[7rem] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)] sm:text-[13rem]">
          404
        </h1>

        {/* Metallic chrome heading */}
        <h2 className="-mt-5 bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-4xl font-black text-transparent sm:-mt-10 sm:text-6xl">
          Stránka nenájdená!
        </h2>

        <p className="mt-4 max-w-sm text-sm text-white/45">
          Táto stránka neexistuje alebo bola presunutá.
        </p>

        {/* Back home */}
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:bg-white/90"
        >
          Späť domov
        </Link>
      </div>
    </main>
  );
}
