"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  BookmarkCheck,
  CalendarDays,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";
import { getCompanyProfile, CompanyProfile } from "../_lib/api/companies";
import { logout } from "../_lib/api/auth";
import { usePrivy } from "@privy-io/react-auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/shortlist", label: "Shortlist", icon: BookmarkCheck },
  { href: "/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const { logout: privyLogout } = usePrivy();

  useEffect(() => {
    getCompanyProfile().then(setCompany).catch(() => {});
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    logout();
    await privyLogout();
    router.push("/");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#0f1117] flex flex-col border-r border-white/5 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">HireOnChain</span>
        </div>
      </div>

      {/* Company / user */}
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-white/90 text-xs font-medium truncate">
          {company?.name ?? "—"}
        </p>
        <p className="text-white/40 text-xs truncate">
          {company?.email ?? ""}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group relative ${
                    active
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Balance */}
      <div className="px-5 py-3 border-t border-white/5">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Available Funds</p>
        <p className="text-white font-semibold text-sm">$8,400 USDC</p>
      </div>

      {/* Sign out */}
      <div className="px-3 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
