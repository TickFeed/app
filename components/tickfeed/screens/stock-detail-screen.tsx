"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  Bell,
  BellOff,
  Share2,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Newspaper,
  Sparkles,
  ChevronRight,
  Minus,
} from "lucide-react"
import {
  getStockDetail,
  getStockChart,
  removeFromWatchlist,
  formatPrice,
  formatChangePct,
  formatLargeNumber,
  formatRelativeTime,
  symbolToColor,
  symbolToLogo,
  type StockDetail,
  type ChartPoint,
} from "@/lib/api"
import { usePriceStream } from "@/hooks/use-price-stream"

const TIME_RANGES = ["1D", "1W", "1M", "3M", "1Y"] as const
type TimeRange = (typeof TIME_RANGES)[number]

interface StockDetailScreenProps {
  token: string
  symbol: string
  onBack: () => void
}

export function StockDetailScreen({ token, symbol, onBack }: StockDetailScreenProps) {
  const [stock, setStock] = useState<StockDetail | null>(null)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("1D")
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadingStock, setLoadingStock] = useState(true)
  const [loadingChart, setLoadingChart] = useState(false)
  const [error, setError] = useState("")

  const [flashClass, setFlashClass] = useState("")

  useEffect(() => {
    async function load() {
      setLoadingStock(true)
      setError("")
      try {
        const detail = await getStockDetail(token, symbol)
        setStock(detail)
        const chart = await getStockChart(token, symbol, "1D")
        setChartPoints(chart)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stock data")
      } finally {
        setLoadingStock(false)
      }
    }
    load()
  }, [token, symbol])

  usePriceStream({
    symbols: [symbol],
    token,
    enabled: true,
    onSnapshot: (quotes) => {
      const quote = quotes.find(q => q.symbol === symbol)
      if (quote && stock) {
        setStock((prev) => prev ? {
          ...prev,
          price: quote.price,
          change: quote.change,
          change_pct: quote.change_pct,
          is_positive: quote.is_positive,
        } : null)
      }
    },
    onPrice: (quote) => {
      if (quote.symbol === symbol) {
        setStock((prev) => prev ? {
          ...prev,
          price: quote.price,
          change: quote.change,
          change_pct: quote.change_pct,
          is_positive: quote.is_positive,
        } : null)
        setFlashClass(quote.is_positive ? "animate-flash-gain" : "animate-flash-loss")
        setTimeout(() => setFlashClass(""), 1000)
      }
    }
  })

  const handleRangeChange = useCallback(async (range: TimeRange) => {
    setTimeRange(range)
    setLoadingChart(true)
    try {
      const chart = await getStockChart(token, symbol, range)
      setChartPoints(chart)
    } catch {
      // keep existing chart
    } finally {
      setLoadingChart(false)
    }
  }, [token, symbol])

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeFromWatchlist(token, symbol)
      onBack()
    } catch {
      setRemoving(false)
      setShowRemoveConfirm(false)
    }
  }

  // Build SVG chart from OHLCV closing prices
  const chartWidth = 340
  const chartHeight = 140
  const padding = 10
  const data = chartPoints.map((p) => p.c)
  const minVal = data.length > 1 ? Math.min(...data) : 0
  const maxVal = data.length > 1 ? Math.max(...data) : 1
  const range = maxVal - minVal || 1

  const points = data
    .map((val, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding * 2)
      const y = chartHeight - padding - ((val - minVal) / range) * (chartHeight - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  const isPositive = stock?.is_positive ?? true
  const chartColor = isPositive ? "#22c55e" : "#ef4444"

  if (loadingStock) {
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
          <button onClick={onBack} className="flex items-center gap-1 text-primary">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
        </div>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
          <button onClick={onBack} className="flex items-center gap-1 text-primary">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <p className="text-muted-foreground text-center">{error || "Stock data unavailable"}</p>
          <button onClick={onBack} className="text-sm text-primary hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-1 text-primary">
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
              style={{ backgroundColor: symbolToColor(stock.symbol) }}
            >
              {symbolToLogo(stock.symbol)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{stock.symbol}</h1>
              <p className="text-sm text-muted-foreground">{stock.name}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className={`flex items-baseline gap-2 px-2 py-1 rounded transition-colors w-fit -ml-2 ${flashClass}`}>
              <span className="text-3xl font-bold text-foreground">{formatPrice(stock.price)}</span>
              <span className="text-sm text-muted-foreground">INR</span>
            </div>
            <div className={`mt-1 flex items-center gap-2 px-2 py-1 rounded transition-colors w-fit -ml-2 ${flashClass}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-gain" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
              <span className={`font-medium ${isPositive ? "text-gain" : "text-loss"}`}>
                {isPositive ? "+" : "-"}{formatChangePct(stock.change_pct)} ({isPositive ? "+" : ""}{formatPrice(stock.change)})
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                <Clock className="h-3 w-3" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-4">
          <div className="rounded-xl bg-card border border-border p-4">
            {loadingChart || data.length === 0 ? (
              <div className="h-36 flex items-center justify-center">
                <div className="text-xs text-muted-foreground animate-pulse">
                  {loadingChart ? "Loading chart…" : "No chart data"}
                </div>
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-36"
                preserveAspectRatio="none"
              >
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
                <defs>
                  <linearGradient id={`cg-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`}
                  fill={`url(#cg-${symbol})`}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={chartColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.length > 0 && (
                  <circle
                    cx={chartWidth - padding}
                    cy={
                      chartHeight -
                      padding -
                      ((data[data.length - 1] - minVal) / range) * (chartHeight - padding * 2)
                    }
                    r="4"
                    fill={chartColor}
                  />
                )}
              </svg>
            )}

            <div className="flex justify-between mt-3 pt-3 border-t border-border">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    timeRange === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {r}
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
            <StatCard label="Day High" value={formatPrice(stock.day_high)} />
            <StatCard label="Day Low" value={formatPrice(stock.day_low)} />
            <StatCard label="Open" value={formatPrice(stock.open)} />
            <StatCard label="Prev Close" value={formatPrice(stock.prev_close)} />
            <StatCard label="Volume" value={formatLargeNumber(stock.volume)} />
            <StatCard
              label="Market Cap"
              value={typeof stock.market_cap === "number" ? formatLargeNumber(stock.market_cap) : stock.market_cap}
            />
            <StatCard label="P/E Ratio" value={stock.pe_ratio != null ? stock.pe_ratio.toFixed(1) : "—"} />
            <StatCard label="Sector" value={stock.sector ?? "—"} />
            <StatCard label="52W High" value={formatPrice(stock.week_52_high)} highlight="gain" />
            <StatCard label="52W Low" value={formatPrice(stock.week_52_low)} highlight="loss" />
          </div>
        </div>

        {/* Related News */}
        {stock.related_news.length > 0 && (
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                Related News
              </h2>
            </div>
            <div className="space-y-2">
              {stock.related_news.slice(0, 3).map((news) => (
                <div key={news.id} className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{news.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {news.source} · {formatRelativeTime(news.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {stock.symbol} shows {isPositive ? "bullish" : "bearish"} momentum today, trading{" "}
              {isPositive ? "up" : "down"} {formatChangePct(stock.change_pct)} from yesterday&apos;s close.
              {stock.sector ? ` Sector: ${stock.sector}.` : ""}
            </p>
            <button className="mt-3 text-xs font-medium text-primary flex items-center gap-1">
              Ask AI about this stock
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
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
                  disabled={removing}
                  className="flex-1 py-2 rounded-lg bg-loss text-sm font-medium text-white disabled:opacity-60"
                >
                  {removing ? "Removing…" : "Remove"}
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
  highlight,
}: {
  label: string
  value: string
  highlight?: "gain" | "loss"
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-sm font-semibold mt-0.5 ${
          highlight === "gain" ? "text-gain" : highlight === "loss" ? "text-loss" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
