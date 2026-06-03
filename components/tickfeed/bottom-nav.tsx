"use client"

import { Home, LineChart, Users, User, Sparkles } from "lucide-react"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const LEFT_TABS = [
  { id: "home",      label: "Home",      icon: Home },
  { id: "watchlist", label: "Watchlist", icon: LineChart },
]

const RIGHT_TABS = [
  { id: "community", label: "Community", icon: Users },
  { id: "profile",   label: "Profile",   icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bg-card/95 backdrop-blur-xl border-t border-border sticky bottom-0 z-50">
      <div
        className="flex items-center justify-around px-2 pt-2"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {LEFT_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}

        {/* Centre AI button */}
        <div className="flex flex-1 flex-col items-center -mt-5 px-2">
          <button
            onClick={() => onTabChange("ai")}
            className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-95 ${
              activeTab === "ai"
                ? "bg-primary shadow-primary/40 scale-105"
                : "bg-primary/85 shadow-primary/20 hover:scale-105"
            }`}
          >
            <Sparkles className="h-6 w-6 text-white" />
            {activeTab === "ai" && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white/80 border-2 border-primary animate-pulse" />
            )}
          </button>
        </div>

        {RIGHT_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
