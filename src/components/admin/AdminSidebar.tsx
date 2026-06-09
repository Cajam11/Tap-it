"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, BarChart3, Clock, LogOut, Newspaper, ShieldCheck, CalendarHeart, MapPinned, Menu, X, CalendarClock } from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import { hasMinAdminRole } from "@/lib/admin-authz";
import type { UserRole } from "@/lib/types";

interface AdminSidebarProps {
  userRole: string;
  userName?: string;
}

export default function AdminSidebar({ userRole, userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the drawer is open so the page behind it
  // can't scroll/reveal underneath (and Android's address bar stays put)
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Verification",
      href: "/admin/verification",
      icon: ShieldCheck,
    },
    {
      label: "Memberships",
      href: "/admin/memberships",
      icon: CreditCard,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Scan Logs",
      href: "/admin/logs",
      icon: Clock,
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: CalendarHeart,
    },
    {
      label: "Smeny",
      href: "/admin/shifts",
      icon: CalendarClock,
    },
    {
      label: "Priestory",
      href: "/admin/priestory",
      icon: MapPinned,
    },
  ];

  if (hasMinAdminRole(userRole as UserRole, "owner")) {
    navItems.push({
      label: "News",
      href: "/admin/news",
      icon: Newspaper,
    });
  }

  const renderNavItems = (opts?: { glow?: boolean }) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            isActive
              ? `bg-red-600 text-white${opts?.glow ? " shadow-[0_8px_24px_rgba(239,62,62,0.35)]" : ""}`
              : "text-white/70 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
      );
    });

  // Desktop: full two-row footer with the "Exit Admin" label (name has room)
  const userProfileDesktop = (
    <div className="p-4 border-t border-white/10 space-y-3">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
          {userName?.charAt(0).toUpperCase() || "A"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{userName || "Admin User"}</p>
          <p className="text-xs text-white/60 capitalize">{userRole}</p>
        </div>
      </div>
      <form action={signOutAdmin}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Admin</span>
        </button>
      </form>
    </div>
  );

  // Mobile: compact single row, icon-only exit with hover tooltip
  const userProfileMobile = (
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
            {userName?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName || "Admin User"}</p>
            <p className="text-xs text-white/60 capitalize">{userRole}</p>
          </div>
        </div>
        <Link
          href="https://tap-it.sk"
          title="Exit Admin"
          aria-label="Exit Admin"
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-[#1a1a1a] border-r border-white/10 flex-col h-screen sticky top-0">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <h2 className="text-lg font-semibold text-white">Tap-it Gym</h2>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">{renderNavItems()}</nav>

        {/* User Profile */}
        {userProfileDesktop}
      </aside>

      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white backdrop-blur transition-colors hover:bg-white/[0.12]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile drawer backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-[55] bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-[60] flex w-[82%] max-w-xs flex-col bg-[#0d0d0d] shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-base font-bold text-white">
              T
            </div>
            <h2 className="text-xl font-semibold text-white">Tap-it Gym</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-2">{renderNavItems({ glow: true })}</nav>

        {/* User Profile */}
        {userProfileMobile}
      </aside>
    </>
  );
}
