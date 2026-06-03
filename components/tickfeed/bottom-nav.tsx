"use client"

import { Home, LineChart, Users, User } from "lucide-react"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home",      label: "Home",      icon: Home },
    { id: "watchlist", label: "Watchlist", icon: LineChart },
    { id: "community", label: "Community", icon: Users },
    { id: "profile",   label: "Profile",   icon: User },
  ]

  return (
    <nav className="bg-card/95 backdrop-blur-xl border-t border-border sticky bottom-0 z-50">
      <div className="flex items-center justify-around px-4 pt-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
