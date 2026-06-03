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

        {/* Centre Tickr button — intentionally larger than sibling tabs */}
        <button
          onClick={() => onTabChange("ai")}
          className="flex flex-1 flex-col items-center gap-0.5 px-2 py-1 transition-colors"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            activeTab === "ai" ? "bg-primary" : "bg-primary/15"
          }`}>
            <Sparkles className={`h-5 w-5 ${activeTab === "ai" ? "text-white" : "text-primary"}`} />
          </span>
        </button>

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
