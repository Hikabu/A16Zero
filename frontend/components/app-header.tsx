"use client"

import * as React from "react"
import { Bell, Menu, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface AppHeaderProps {
  onOpenCommandPalette?: () => void
}

export function AppHeader({ onOpenCommandPalette }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Left section */}
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        {/* Breadcrumb area - can be customized per page */}
        <div className="flex-1">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Dashboard</span>
          </nav>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 w-64 justify-start text-muted-foreground md:flex"
            onClick={onOpenCommandPalette}
          >
            <Search className="mr-2 size-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Mobile search */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={onOpenCommandPalette}
          >
            <Search className="size-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Quick actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="h-8 gap-1">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Create New</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Add Candidate</DropdownMenuItem>
              <DropdownMenuItem>Create Job</DropdownMenuItem>
              <DropdownMenuItem>Import from GitHub</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Bulk Import</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative size-8">
                <Bell className="size-4" />
                <span className="sr-only">Notifications</span>
                {/* Notification indicator */}
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <NotificationItem
                  title="New candidate match"
                  description="Sarah Chen matches 4 open positions"
                  time="2 min ago"
                  unread
                />
                <NotificationItem
                  title="Analysis complete"
                  description="GitHub analysis for @johndoe is ready"
                  time="15 min ago"
                  unread
                />
                <NotificationItem
                  title="Pipeline update"
                  description="3 candidates moved to interview stage"
                  time="1 hour ago"
                  unread
                />
                <NotificationItem
                  title="Weekly report"
                  description="Your weekly hiring analytics are ready"
                  time="2 hours ago"
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function NotificationItem({
  title,
  description,
  time,
  unread,
}: {
  title: string
  description: string
  time: string
  unread?: boolean
}) {
  return (
    <div
      className={`flex gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${
        unread ? "bg-primary/5" : ""
      }`}
    >
      {unread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
      <div className={unread ? "" : "ml-5"}>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}
