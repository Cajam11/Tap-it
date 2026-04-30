"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, BarChart3, Clock, LogOut } from "lucide-react";

interface AdminSidebarProps {
  userRole: string;
  userName?: string;
}

export default function AdminSidebar({ userRole, userName }: AdminSidebarProps) {
  const pathname = usePathname();

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
  ];

  return (
    <aside className="w-64 bg-[#1a1a1a] border-r border-white/10 flex flex-col h-screen sticky top-0">
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
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-red-600 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
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
        <Link
          href="https://tap-it.sk"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors text-sm w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Admin</span>
        </Link>
      </div>
    </aside>
  );
}
