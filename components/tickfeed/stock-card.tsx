"use client"

import { useEffect, useState } from "react"
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
  const [flashClass, setFlashClass] = useState("")

  useEffect(() => {
    // Only flash if we have a valid price and it's not the initial mount
    if (price && price !== "—") {
      setFlashClass(isPositive ? "animate-flash-gain" : "animate-flash-loss")
      const t = setTimeout(() => setFlashClass(""), 1000)
      return () => clearTimeout(t)
    }
  }, [price, isPositive])

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
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{name}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Bell className="h-3 w-3" />
            <span>{updatesCount} updates</span>
          </div>
        </div>

        {/* Price and chart */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={`text-right px-2 py-1 rounded transition-colors ${flashClass}`}>
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
