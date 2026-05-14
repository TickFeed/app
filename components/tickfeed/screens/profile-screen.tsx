"use client"

import { Settings, ChevronRight, Bell, Bookmark, Clock, HelpCircle, LogOut, Moon, Sun } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"

const MENU_ITEMS = [
  {
    icon: Bell,
    label: "Notifications",
    description: "Manage your alert preferences",
    hasArrow: true,
  },
  {
    icon: Bookmark,
    label: "Saved Articles",
    description: "12 articles saved",
    hasArrow: true,
  },
  {
    icon: Clock,
    label: "Reading History",
    description: "Your recent activity",
    hasArrow: true,
  },
  {
    icon: Settings,
    label: "Settings",
    description: "App preferences",
    hasArrow: true,
  },
  {
    icon: HelpCircle,
    label: "Help & Support",
    description: "FAQs and contact us",
    hasArrow: true,
  },
]

const WATCHLIST_PREVIEW = [
  { symbol: "HDFCBANK", change: "+1.28%", isPositive: true },
  { symbol: "TCS", change: "+2.18%", isPositive: true },
  { symbol: "RELIANCE", change: "-0.28%", isPositive: false },
  { symbol: "INFY", change: "+1.02%", isPositive: true },
]

export function ProfileScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* User Card */}
        <div className="mx-4 mt-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                RS
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">Rahul Sharma</h2>
              <p className="text-sm text-muted-foreground truncate">rahul@example.com</p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  Premium
                </span>
                <span className="text-xs text-muted-foreground">
                  Since Jan 2024
                </span>
              </div>
            </div>
            <button className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Watchlist Preview */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Your Watchlist</h3>
            <button className="text-sm font-medium text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WATCHLIST_PREVIEW.map((stock) => (
              <div
                key={stock.symbol}
                className="rounded-lg bg-card border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <span className="font-medium text-sm text-foreground">{stock.symbol}</span>
                <span
                  className={`ml-2 text-xs font-medium ${
                    stock.isPositive ? "text-gain" : "text-loss"
                  }`}
                >
                  {stock.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">24</div>
            <div className="text-xs text-muted-foreground">Articles Read</div>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">6</div>
            <div className="text-xs text-muted-foreground">Stocks</div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mx-4 mt-6">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex w-full items-center justify-between rounded-lg bg-card border border-border p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                {isDarkMode ? (
                  <Moon className="h-5 w-5 text-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-foreground" />
                )}
              </div>
              <div className="text-left">
                <span className="font-medium text-foreground">
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </span>
                <p className="text-xs text-muted-foreground">Tap to toggle theme</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${
              isDarkMode ? "bg-primary" : "bg-muted"
            }`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isDarkMode ? "left-7" : "left-1"
              }`} />
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <div className="mx-4 mt-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-medium text-sm text-foreground">{item.label}</span>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {item.hasArrow && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Logout */}
        <div className="mx-4 mt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive hover:bg-destructive/20 transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        {/* App Version */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">TickFeed v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
