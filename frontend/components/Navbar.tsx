"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LogOut, Menu, LayoutDashboard, Users, Briefcase, Workflow, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/auth-store"
import { useLogout } from "@/lib/hooks/useLogout"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
] as const

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function DashboardNavbar() {
  const pathname = usePathname()
  const doLogout = useLogout()
  const username = useAuthStore((s) => s.username)
  const [open, setOpen] = useState(false)

  // Close sheet on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href

  const handleLogout = () => {
    doLogout()
  }

  const displayName = username ?? "HR User"
  const initials = getInitials(displayName)

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-full flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0"
        >
          <Image
            src="/logo-transparent.png"
            alt="16signals"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="font-mono font-bold text-sm tracking-tight text-foreground">
            16signals
          </span>
        </Link>

        {/* Center nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors px-3 py-1.5 rounded-md flex items-center gap-2",
                isActive(item.href)
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Avatar dropdown — desktop */}
        <div className="hidden md:flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 rounded-full p-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-mono font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 flex flex-col gap-6 pt-10">
            {/* User identity */}
            <div className="flex items-center gap-3 px-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-mono font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-mono font-medium text-foreground truncate">
                {displayName}
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors px-3 py-2.5 rounded-md flex items-center gap-2",
                    isActive(item.href)
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Bottom actions */}
            <div className="flex flex-col gap-1 mt-auto border-t border-border pt-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors px-3 py-2.5 rounded-md hover:bg-destructive/10 text-left"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}