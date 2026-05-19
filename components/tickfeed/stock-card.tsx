"use client"

import { MessageSquare } from "lucide-react"

interface StockCardProps {
  symbol: string
  name: string
  discussCount: number
  logo?: string
  logoColor?: string
  onClick?: () => void
}

export function StockCard({
  symbol,
  name,
  discussCount,
  logo,
  logoColor = "#1e40af",
  onClick,
}: StockCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: logoColor }}
        >
          {logo || symbol.slice(0, 2)}
        </div>

        {/* Stock info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{symbol}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {discussCount > 0 && (
              <span>{discussCount} {discussCount === 1 ? "discussion" : "discussions"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
