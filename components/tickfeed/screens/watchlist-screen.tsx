"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Search, TrendingUp, TrendingDown, Trash2, CheckCircle2, Circle } from "lucide-react"
import { StockCard } from "../stock-card"
import {
  getWatchlist,
  removeFromWatchlist,
  formatPrice,
  formatChangePct,
  symbolToName,
  symbolToColor,
  symbolToLogo,
  type WatchlistItem,
} from "@/lib/api"
import { invalidateMyStocksCache } from "./home-screen"
import { usePriceStream } from "@/hooks/use-price-stream"

interface DisplayStock {
  symbol: string
  name: string
  price: string
  change: string
  isPositive: boolean
  chartData: number[]
  logoColor: string
  logo: string
}

interface WatchlistScreenProps {
  token: string
  onStockClick?: (symbol: string) => void
  onAddStock?: () => void
}

function watchlistItemToDisplay(item: WatchlistItem): DisplayStock {
  return {
    symbol: item.symbol,
    name: symbolToName(item.symbol),
    price: item.price != null ? formatPrice(item.price) : "—",
    change: item.change_pct != null ? formatChangePct(item.change_pct) : "—",
    isPositive: item.is_positive ?? true,
    chartData: item.sparkline,
    logoColor: symbolToColor(item.symbol),
    logo: symbolToLogo(item.symbol),
  }
}

export function WatchlistScreen({ token, onStockClick, onAddStock }: WatchlistScreenProps) {
  const [stocks, setStocks] = useState<DisplayStock[]>([])
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState(false)

  // Load watchlist structure (symbols + names) once on mount
  const fetchWatchlist = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const items = await getWatchlist(token)
      setStocks(items.map(watchlistItemToDisplay))
      setSymbols(items.map((i) => i.symbol))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  // SSE: receive snapshot or individual price updates, update only what changed
  usePriceStream({
    symbols,
    token,
    enabled: symbols.length > 0,
    onSnapshot: (quotes) => {
      const priceMap = new Map(quotes.map((q) => [q.symbol, q]))
      setStocks((prev) =>
        prev.map((s) => {
          const q = priceMap.get(s.symbol)
          if (!q) return s
          return {
            ...s,
            price: formatPrice(q.price),
            change: formatChangePct(q.change_pct),
            isPositive: q.is_positive,
          }
        }),
      )
    },
    onPrice: (quote) => {
      setStocks((prev) =>
        prev.map((s) =>
          s.symbol === quote.symbol
            ? {
                ...s,
                price: formatPrice(quote.price),
                change: formatChangePct(quote.change_pct),
                isPositive: quote.is_positive,
              }
            : s,
        ),
      )
    },
  })

  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalGainers = stocks.filter((s) => s.isPositive).length
  const totalLosers = stocks.filter((s) => !s.isPositive).length

  const enterEdit = () => { setEditMode(true); setSelected(new Set()) }
  const exitEdit  = () => { setEditMode(false); setSelected(new Set()) }

  const toggleSelect = (symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(symbol) ? next.delete(symbol) : next.add(symbol)
      return next
    })
  }

  const handleRemove = async () => {
    if (selected.size === 0) return
    setRemoving(true)
    try {
      await Promise.all([...selected].map((sym) => removeFromWatchlist(token, sym)))
      setStocks((prev) => prev.filter((s) => !selected.has(s.symbol)))
      setSymbols((prev) => prev.filter((s) => !selected.has(s)))
      invalidateMyStocksCache()
      exitEdit()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">
          {editMode ? "Select Stocks" : "My Stocks"}
        </h1>
        <div className="flex items-center gap-2">
          {editMode ? (
            <button
              onClick={exitEdit}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          ) : (
            <>
              {!loading && stocks.length > 0 && (
                <>
                  <button
                    onClick={onAddStock}
                    className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={enterEdit}
                    className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* Portfolio Summary */}
      {!loading && stocks.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-gain/10 border border-gain/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gain" />
                <span className="text-xs text-muted-foreground">Gainers</span>
              </div>
              <p className="text-xl font-bold text-gain mt-1">{totalGainers}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-loss/10 border border-loss/20">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-loss" />
                <span className="text-xs text-muted-foreground">Losers</span>
              </div>
              <p className="text-xl font-bold text-loss mt-1">{totalLosers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {!loading && stocks.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your stocks..."
              className="w-full rounded-full bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Stock Count */}
      {!loading && stocks.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            {filteredStocks.length} {filteredStocks.length === 1 ? "stock" : "stocks"} in watchlist
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-muted mb-1" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
                <div className="h-8 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-muted-foreground">{error}</p>
            <button onClick={fetchWatchlist} className="mt-3 text-sm text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : filteredStocks.length > 0 ? (
          filteredStocks.map((stock) => (
            <div key={stock.symbol} className="relative flex items-center">
              {editMode && (
                <button
                  onClick={() => toggleSelect(stock.symbol)}
                  className="absolute left-4 z-10 flex-shrink-0"
                >
                  {selected.has(stock.symbol)
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <Circle className="h-5 w-5 text-muted-foreground/50" />}
                </button>
              )}
              <div className={`flex-1 ${editMode ? "pl-8" : ""} ${editMode && selected.has(stock.symbol) ? "bg-primary/5" : ""}`}>
                <StockCard
                  symbol={stock.symbol}
                  name={stock.name}
                  price={stock.price}
                  change={stock.change}
                  isPositive={stock.isPositive}
                  updatesCount={0}
                  chartData={stock.chartData}
                  logo={stock.logo}
                  logoColor={stock.logoColor}
                  onClick={() => editMode ? toggleSelect(stock.symbol) : onStockClick?.(stock.symbol)}
                />
              </div>
            </div>
          ))
        ) : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No stocks yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add stocks to track their performance
            </p>
            <button
              onClick={onAddStock}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Add Your First Stock
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No stocks found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Remove bar — shown in edit mode */}
      {editMode && (
        <div className="px-4 py-3 border-t border-border bg-background">
          <button
            onClick={handleRemove}
            disabled={selected.size === 0 || removing}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-40
              bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 disabled:hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            {removing
              ? "Removing…"
              : selected.size === 0
              ? "Select stocks to remove"
              : `Remove ${selected.size} stock${selected.size > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  )
}
