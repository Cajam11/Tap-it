import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Simple top bar */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-extrabold text-white text-lg tracking-tight"
        >
          Premium<span className="text-red-500">Gyms</span>
        </Link>
      </header>

      {/* Centered auth card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </div>
    </div>
  );
}
