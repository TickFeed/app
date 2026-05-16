"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface TickerItem {
  symbol: string
  value: string
  change: string
  isPositive: boolean
}

interface MarketDigestProps {
  items: TickerItem[]
  brief?: string | null
  label?: string
}

export function MarketDigest({ items, brief, label = "Market at a Glance" }: MarketDigestProps) {
  if (items.length === 0) return null

  const primary = items.slice(0, 2)
  const secondary = items.slice(2)

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-800/90 to-zinc-900/95 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
        {label}
      </p>

      {/* Primary indices */}
      <div className="flex gap-4 mb-2">
        {primary.map((item) => (
          <div key={item.symbol} className="flex-1">
            <p className="text-[11px] text-zinc-400 truncate">{item.symbol}</p>
            <p className="text-base font-bold text-white leading-tight">{item.value}</p>
            <div className={`flex items-center gap-0.5 text-xs font-medium ${item.isPositive ? "text-gain" : "text-loss"}`}>
              {item.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {item.isPositive ? "+" : ""}{item.change}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary indices */}
      {secondary.length > 0 && (
        <div className="flex gap-4 pt-2 border-t border-zinc-700/50">
          {secondary.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 truncate max-w-[70px]">{item.symbol}</span>
              <span className="text-xs font-semibold text-zinc-300">{item.value}</span>
              <span className={`text-[10px] font-medium ${item.isPositive ? "text-gain" : "text-loss"}`}>
                {item.isPositive ? "+" : ""}{item.change}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* AI market brief */}
      {brief && (
        <p className="mt-2 pt-2 border-t border-zinc-700/50 text-[11px] leading-relaxed text-zinc-400">
          {brief}
        </p>
      )}
    </div>
  )
}
