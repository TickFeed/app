"use client"

import { Bell } from "lucide-react"
import { Sparkline } from "./sparkline"

interface StockCardProps {
  symbol: string
  name: string
  price: string
  change: string
  isPositive: boolean
  updatesCount: number
  chartData: number[]
  logo?: string
  logoColor?: string
  onClick?: () => void
}

export function StockCard({
  symbol,
  name,
  price,
  change,
  isPositive,
  updatesCount,
  chartData,
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
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm"
          style={{ backgroundColor: logoColor }}
        >
          {logo || symbol.slice(0, 2)}
        </div>

        {/* Stock info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{name}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Bell className="h-3 w-3" />
            <span>{updatesCount} new updates</span>
          </div>
        </div>

        {/* Price and chart */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-foreground">{price}</div>
            <div className={`text-xs font-medium ${isPositive ? "text-gain" : "text-loss"}`}>
              {isPositive ? "+" : ""}{change}
            </div>
          </div>
          <Sparkline 
            data={chartData} 
            color={isPositive ? "gain" : "loss"}
            width={60}
            height={28}
          />
        </div>
      </div>
    </div>
  )
}
