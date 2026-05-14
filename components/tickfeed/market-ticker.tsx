"use client"

interface TickerItem {
  symbol: string
  value: string
  change: string
  isPositive: boolean
}

interface MarketTickerProps {
  items: TickerItem[]
}

export function MarketTicker({ items }: MarketTickerProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-3">
      {items.map((item, index) => (
        <div
          key={item.symbol}
          className={`flex flex-col items-center ${
            index !== items.length - 1 ? "border-r border-border/50 pr-4" : ""
          } ${index !== 0 ? "pl-4" : ""}`}
        >
          <span className="text-xs font-medium text-muted-foreground">
            {item.symbol}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {item.value}
          </span>
          <span
            className={`text-xs font-medium ${
              item.isPositive ? "text-gain" : "text-loss"
            }`}
          >
            {item.isPositive ? "+" : ""}{item.change}
          </span>
        </div>
      ))}
    </div>
  )
}
