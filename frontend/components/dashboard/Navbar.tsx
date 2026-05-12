"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logout } from "@/lib/auth"

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/candidates", label: "Candidates" },
    { href: "/dashboard/jobs", label: "Jobs" },
    { href: "/dashboard/pipeline", label: "Pipeline" },
    { href: "/dashboard/analytics", label: "Analytics" },
  ]

  const handleLogout = async () => {
    await logout()
    router.push("/auth")
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-4 bg-background">
      <div className="flex items-center gap-6">
        <div className="font-bold text-xl tracking-tight">16Signals</div>
        <div className="hidden md:flex items-center gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Logout
      </button>
    </nav>
  )
}
