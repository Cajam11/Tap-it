"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User as UserIcon, Settings, CreditCard } from "lucide-react";

type NavUser = {
  id: string;
  email: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

type NavProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
} | null;

interface NavBarAuthProps {
  navLinks: [string, string][];
  initialUser?: NavUser | null;
  initialProfile?: NavProfile;
}

export default function NavBarAuth({ navLinks, initialUser = null, initialProfile = null }: NavBarAuthProps) {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(initialUser);
  const [profile, setProfile] = useState<NavProfile>(initialProfile);
  const [avatarRevision, setAvatarRevision] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ full_name?: string | null; avatar_url?: string | null }>;
      const nextName = typeof customEvent.detail?.full_name === "string" ? customEvent.detail.full_name : null;
      const nextAvatar = typeof customEvent.detail?.avatar_url === "string" ? customEvent.detail.avatar_url : null;

      setProfile((prev) => ({
        ...(prev ?? {}),
        full_name: nextName,
        avatar_url: nextAvatar,
      }));

      setAvatarRevision(Date.now());

      setUser((prev) =>
        prev
          ? {
              ...prev,
              user_metadata: {
                ...(prev.user_metadata ?? {}),
                full_name: nextName ?? undefined,
                avatar_url: nextAvatar ?? undefined,
              },
            }
          : prev
      );
    }

    window.addEventListener("profile-updated", handleProfileUpdated as EventListener);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated as EventListener);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    router.refresh();
  };

  // Najprv pozeráme do našej databázy (profile), ak tam nič nie je, až potom do Google (user_metadata)
  const fullName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const avatarUrl =
    profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined);
  const avatarSrc = (() => {
    if (!avatarUrl) {
      return undefined;
    }

    if (!avatarRevision) {
      return avatarUrl;
    }

    try {
      const url = new URL(avatarUrl);
      url.searchParams.set("rev", String(avatarRevision));
      return url.toString();
    } catch {
      return avatarUrl;
    }
  })();

  return (
    <header className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-6xl flex items-center justify-between h-14 px-6 rounded-full bg-black/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
        <Link
          href="/"
          className="font-extrabold text-white text-lg tracking-tight focus-visible:ring-2 focus-visible:ring-red-500 rounded-full px-1 outline-none"
        >
          Premium<span className="text-red-500">Gyms</span>
        </Link>

        <nav
          className="hidden lg:flex items-center gap-0.5 text-[13px] font-medium text-white/60"
          aria-label="Primary navigation"
        >
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right side – auth buttons or user profile */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full px-1.5 py-1 hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
              >
                {avatarSrc ? (
                  <img
                    key={avatarSrc}
                    src={avatarSrc}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:block text-sm font-medium text-white/80 max-w-[120px] truncate">
                  {fullName}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#181818] border border-white/10 shadow-2xl py-1.5 overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    Profil
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Nastavenia
                  </Link>
                  <Link
                    href="/membership"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Členstvo
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Odhlásiť sa
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
              >
                Prihlásiť sa
              </Link>
              <Link
                href="/register"
                className="text-sm bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold px-5 py-2 rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none"
              >
                Registrácia
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
