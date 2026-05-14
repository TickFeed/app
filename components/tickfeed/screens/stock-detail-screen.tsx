"use client"

import { useState } from "react"
import { 
  ChevronLeft, 
  Bell, 
  BellOff,
  Share2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Building2,
  BarChart3,
  Newspaper,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Minus
} from "lucide-react"

interface StockDetailScreenProps {
  symbol: string
  onBack: () => void
  onRemove?: (symbol: string) => void
}

const STOCK_DATA: Record<string, {
  symbol: string
  name: string
  price: string
  change: string
  changeAmount: string
  isPositive: boolean
  logoColor: string
  logo: string
  dayHigh: string
  dayLow: string
  open: string
  prevClose: string
  volume: string
  avgVolume: string
  marketCap: string
  pe: string
  eps: string
  dividend: string
  week52High: string
  week52Low: string
  chartData: number[]
}> = {
  HDFCBANK: {
    symbol: "HDFCBANK",
    name: "HDFC Bank Limited",
    price: "1,642.55",
    change: "+1.28%",
    changeAmount: "+20.75",
    isPositive: true,
    logoColor: "#dc2626",
    logo: "H",
    dayHigh: "1,658.00",
    dayLow: "1,618.30",
    open: "1,625.00",
    prevClose: "1,621.80",
    volume: "8.2M",
    avgVolume: "12.5M",
    marketCap: "12.4T",
    pe: "19.8",
    eps: "82.95",
    dividend: "1.15%",
    week52High: "1,880.00",
    week52Low: "1,363.55",
    chartData: [1580, 1595, 1610, 1598, 1620, 1635, 1625, 1642, 1650, 1645, 1638, 1642],
  },
  TCS: {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd.",
    price: "3,980.25",
    change: "+2.18%",
    changeAmount: "+84.85",
    isPositive: true,
    logoColor: "#1e40af",
    logo: "TCS",
    dayHigh: "3,995.00",
    dayLow: "3,890.00",
    open: "3,905.00",
    prevClose: "3,895.40",
    volume: "2.8M",
    avgVolume: "3.2M",
    marketCap: "14.5T",
    pe: "28.5",
    eps: "139.66",
    dividend: "1.28%",
    week52High: "4,255.00",
    week52Low: "3,056.00",
    chartData: [3850, 3880, 3920, 3895, 3940, 3960, 3945, 3970, 3990, 3985, 3975, 3980],
  },
  RELIANCE: {
    symbol: "RELIANCE",
    name: "Reliance Industries Limited",
    price: "2,945.80",
    change: "-0.28%",
    changeAmount: "-8.30",
    isPositive: false,
    logoColor: "#0d9488",
    logo: "R",
    dayHigh: "2,972.00",
    dayLow: "2,932.50",
    open: "2,960.00",
    prevClose: "2,954.10",
    volume: "5.1M",
    avgVolume: "6.8M",
    marketCap: "19.9T",
    pe: "26.2",
    eps: "112.43",
    dividend: "0.32%",
    week52High: "3,217.60",
    week52Low: "2,220.30",
    chartData: [2980, 2965, 2950, 2970, 2955, 2940, 2958, 2948, 2935, 2950, 2942, 2945],
  },
  INFY: {
    symbol: "INFY",
    name: "Infosys Limited",
    price: "1,497.40",
    change: "+1.02%",
    changeAmount: "+15.12",
    isPositive: true,
    logoColor: "#2563eb",
    logo: "INF",
    dayHigh: "1,508.00",
    dayLow: "1,478.00",
    open: "1,485.00",
    prevClose: "1,482.28",
    volume: "4.5M",
    avgVolume: "5.8M",
    marketCap: "6.2T",
    pe: "23.8",
    eps: "62.92",
    dividend: "2.45%",
    week52High: "1,953.90",
    week52Low: "1,358.35",
    chartData: [1470, 1482, 1475, 1490, 1485, 1492, 1498, 1495, 1500, 1492, 1495, 1497],
  },
  ICICIBANK: {
    symbol: "ICICIBANK",
    name: "ICICI Bank Limited",
    price: "1,190.60",
    change: "+0.65%",
    changeAmount: "+7.70",
    isPositive: true,
    logoColor: "#dc2626",
    logo: "I",
    dayHigh: "1,198.00",
    dayLow: "1,178.50",
    open: "1,185.00",
    prevClose: "1,182.90",
    volume: "6.8M",
    avgVolume: "9.2M",
    marketCap: "8.4T",
    pe: "17.5",
    eps: "68.03",
    dividend: "0.84%",
    week52High: "1,362.35",
    week52Low: "1,025.45",
    chartData: [1175, 1180, 1172, 1185, 1190, 1182, 1188, 1195, 1190, 1185, 1188, 1190],
  },
  WIPRO: {
    symbol: "WIPRO",
    name: "Wipro Limited",
    price: "485.30",
    change: "+1.45%",
    changeAmount: "+6.95",
    isPositive: true,
    logoColor: "#7c3aed",
    logo: "W",
    dayHigh: "490.00",
    dayLow: "476.50",
    open: "480.00",
    prevClose: "478.35",
    volume: "3.2M",
    avgVolume: "4.5M",
    marketCap: "2.5T",
    pe: "21.2",
    eps: "22.89",
    dividend: "0.21%",
    week52High: "584.00",
    week52Low: "396.30",
    chartData: [472, 478, 474, 480, 482, 478, 484, 488, 485, 482, 484, 485],
  },
}

const NEWS_ITEMS = [
  {
    id: "1",
    headline: "Q4 results beat street expectations",
    time: "2h ago",
    source: "Economic Times",
  },
  {
    id: "2",
    headline: "Analysts raise price target by 15%",
    time: "5h ago",
    source: "Moneycontrol",
  },
  {
    id: "3",
    headline: "Company announces dividend payout",
    time: "1d ago",
    source: "Business Standard",
  },
]

const TIME_RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"]

export function StockDetailScreen({ symbol, onBack, onRemove }: StockDetailScreenProps) {
  const [timeRange, setTimeRange] = useState("1D")
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const stock = STOCK_DATA[symbol] || STOCK_DATA.HDFCBANK

  // Generate chart path
  const chartWidth = 340
  const chartHeight = 140
  const padding = 10
  const data = stock.chartData
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2)
    const y = chartHeight - padding - ((val - minVal) / range) * (chartHeight - padding * 2)
    return `${x},${y}`
  }).join(" ")

  const handleRemove = () => {
    onRemove?.(symbol)
    onBack()
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={`rounded-full p-2 transition-colors ${
              alertsEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {alertsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Stock Header */}
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: stock.logoColor }}
            >
              {stock.logo}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{stock.symbol}</h1>
              <p className="text-sm text-muted-foreground">{stock.name}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{stock.price}</span>
              <span className="text-sm text-muted-foreground">INR</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {stock.isPositive ? (
                <TrendingUp className="h-4 w-4 text-gain" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
              <span className={`font-medium ${stock.isPositive ? "text-gain" : "text-loss"}`}>
                {stock.change} ({stock.changeAmount})
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-4">
          <div className="rounded-xl bg-card border border-border p-4">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-36"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1={padding}
                  y1={padding + (i * (chartHeight - padding * 2)) / 3}
                  x2={chartWidth - padding}
                  y2={padding + (i * (chartHeight - padding * 2)) / 3}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  className="text-border"
                />
              ))}
              
              {/* Gradient fill */}
              <defs>
                <linearGradient id={`chartGradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={stock.isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={stock.isPositive ? "#22c55e" : "#ef4444"} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Fill area */}
              <polygon
                points={`${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`}
                fill={`url(#chartGradient-${symbol})`}
              />

              {/* Line */}
              <polyline
                points={points}
                fill="none"
                stroke={stock.isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current price dot */}
              <circle
                cx={chartWidth - padding}
                cy={chartHeight - padding - ((data[data.length - 1] - minVal) / range) * (chartHeight - padding * 2)}
                r="4"
                fill={stock.isPositive ? "#22c55e" : "#ef4444"}
              />
            </svg>

            {/* Time range selector */}
            <div className="flex justify-between mt-3 pt-3 border-t border-border">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    timeRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="px-4 mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Key Statistics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Day High" value={stock.dayHigh} />
            <StatCard label="Day Low" value={stock.dayLow} />
            <StatCard label="Open" value={stock.open} />
            <StatCard label="Prev Close" value={stock.prevClose} />
            <StatCard label="Volume" value={stock.volume} />
            <StatCard label="Avg Volume" value={stock.avgVolume} />
            <StatCard label="Market Cap" value={stock.marketCap} />
            <StatCard label="P/E Ratio" value={stock.pe} />
            <StatCard label="EPS" value={stock.eps} />
            <StatCard label="Dividend" value={stock.dividend} />
            <StatCard label="52W High" value={stock.week52High} highlight="gain" />
            <StatCard label="52W Low" value={stock.week52Low} highlight="loss" />
          </div>
        </div>

        {/* Related News */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              Related News
            </h2>
            <button className="text-xs text-primary font-medium flex items-center gap-1">
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {NEWS_ITEMS.map((news) => (
              <div 
                key={news.id}
                className="p-3 rounded-xl bg-card border border-border"
              >
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {news.headline}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {news.source} · {news.time}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="px-4 mt-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">AI Insights</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {stock.symbol} shows strong momentum with {stock.isPositive ? "bullish" : "bearish"} signals. 
              The stock is trading {stock.isPositive ? "above" : "below"} its 50-day moving average 
              with {stock.isPositive ? "increasing" : "decreasing"} volume.
            </p>
            <button className="mt-3 text-xs font-medium text-primary flex items-center gap-1">
              Ask AI about this stock
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Discussions */}
        <div className="px-4 mt-6">
          <button className="w-full p-4 rounded-xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Community Discussions</p>
                <p className="text-xs text-muted-foreground">24 active discussions</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Remove from Watchlist */}
        <div className="px-4 mt-6 mb-6">
          {!showRemoveConfirm ? (
            <button 
              onClick={() => setShowRemoveConfirm(true)}
              className="w-full p-3 rounded-xl border border-loss/30 text-loss text-sm font-medium flex items-center justify-center gap-2 hover:bg-loss/10 transition-colors"
            >
              <Minus className="h-4 w-4" />
              Remove from Watchlist
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-loss/10 border border-loss/30">
              <p className="text-sm text-foreground text-center mb-3">
                Remove {stock.symbol} from your watchlist?
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-muted text-sm font-medium text-foreground"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRemove}
                  className="flex-1 py-2 rounded-lg bg-loss text-sm font-medium text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  highlight 
}: { 
  label: string
  value: string
  highlight?: "gain" | "loss"
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${
        highlight === "gain" ? "text-gain" : 
        highlight === "loss" ? "text-loss" : 
        "text-foreground"
      }`}>
        {value}
      </p>
    </div>
  )
}
