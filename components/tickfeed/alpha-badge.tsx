"use client"

import { Crown, Zap, Target, Flame, Star, Eye, Circle } from "lucide-react"

export function calcAlphaScore(posts: number, likes: number, followers: number) {
  return posts * 15 + likes * 8 + followers * 25
}

export const ALPHA_BADGE_TIERS = [
  { min: 3000, Icon: Crown,  color: "text-amber-500",   showInline: true  },
  { min: 1500, Icon: Zap,    color: "text-purple-500",  showInline: true  },
  { min: 700,  Icon: Target, color: "text-blue-500",    showInline: true  },
  { min: 300,  Icon: Flame,  color: "text-emerald-500", showInline: true  },
  { min: 100,  Icon: Star,   color: "text-rose-500",    showInline: true  },
  { min: 1,    Icon: Eye,    color: "text-slate-400",   showInline: false },
  { min: 0,    Icon: Circle, color: "text-zinc-400",    showInline: false },
]

interface AlphaBadgeProps {
  score: number
  size?: "sm" | "md"
  /** Set true in rankings list to show all tiers including Observer/Lurker */
  showAll?: boolean
}

export function AlphaBadge({ score, size = "sm", showAll = false }: AlphaBadgeProps) {
  const tier = ALPHA_BADGE_TIERS.find((t) => score >= t.min)
  if (!tier) return null
  if (!showAll && !tier.showInline) return null
  const { Icon, color } = tier
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"
  return <Icon className={`${cls} ${color} shrink-0`} />
}
