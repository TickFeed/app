"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Search, Plus, Check, TrendingUp, TrendingDown } from "lucide-react"
import {
  searchStocks,
  getTrendingStocks,
  addToWatchlist,
  removeFromWatchlist,
  formatPrice,
  formatChangePct,
  symbolToColor,
  symbolToLogo,
  symbolToName,
  type StockSearchResult,
  type TrendingStockItem,
} from "@/lib/api"
import { invalidateMyStocksCache } from "./home-screen"

interface AddStockScreenProps {
  token: string
  onBack: () => void
}

type ListItem =
  | { kind: "search"; data: StockSearchResult }
  | { kind: "trending"; data: TrendingStockItem }

export function AddStockScreen({ token, onBack }: AddStockScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [trending, setTrending] = useState<TrendingStockItem[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [searching, setSearching] = useState(false)
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set())
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function init() {
      setLoadingTrending(true)
      try {
        const items = await getTrendingStocks(token)
        setTrending(items)
      } catch {
        // non-critical
      } finally {
        setLoadingTrending(false)
      }
    }
    init()
  }, [token])

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchStocks(token, searchQuery)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, token])

  const handleToggle = useCallback(async (symbol: string) => {
    const wasAdded = watchlistSymbols.has(symbol)
    // Optimistic update — flip immediately so the tick/plus changes at once
    setWatchlistSymbols((prev) => {
      const s = new Set(prev)
      wasAdded ? s.delete(symbol) : s.add(symbol)
      return s
    })
    setPendingSymbol(symbol)
    try {
      if (wasAdded) {
        await removeFromWatchlist(token, symbol)
      } else {
        await addToWatchlist(token, symbol)
      }
    } catch {
      // Revert optimistic update on failure
      setWatchlistSymbols((prev) => {
        const s = new Set(prev)
        wasAdded ? s.add(symbol) : s.delete(symbol)
        return s
      })
    } finally {
      setPendingSymbol(null)
      invalidateMyStocksCache()
    }
  }, [token, watchlistSymbols])

  const isAdded = (symbol: string) => watchlistSymbols.has(symbol)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <button
          onClick={onBack}
          className="rounded-full p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Add Stock</h1>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stocks by name or symbol..."
            autoFocus
            className="w-full rounded-xl bg-muted py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() ? (
          <>
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">
                {searching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <div className="pb-4">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <StockRow
                    key={item.symbol}
                    symbol={item.symbol}
                    name={item.name}
                    isAdded={isAdded(item.symbol)}
                    isPending={pendingSymbol === item.symbol}
                    onToggle={() => handleToggle(item.symbol)}
                  />
                ))
              ) : !searching ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No stocks found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Try a different term</p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {/* Trending */}
            <div className="px-4 pb-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Today
              </p>
            </div>
            <div className="pb-4">
              {loadingTrending ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="flex-1">
                      <div className="h-3 w-20 rounded bg-muted mb-1" />
                      <div className="h-3 w-28 rounded bg-muted" />
                    </div>
                    <div className="h-8 w-20 rounded bg-muted" />
                  </div>
                ))
              ) : (
                trending.map((item) => (
                  <StockRow
                    key={item.symbol}
                    symbol={item.symbol}
                    name={item.name}
                    price={formatPrice(item.price)}
                    change={formatChangePct(item.change_pct)}
                    isPositive={item.is_positive}
                    isAdded={isAdded(item.symbol)}
                    isPending={pendingSymbol === item.symbol}
                    onToggle={() => handleToggle(item.symbol)}
                  />
                ))
              )}
            </div>

            {/* Browse by sector */}
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-foreground mb-3">Browse by Sector</p>
              <div className="flex flex-wrap gap-2">
                {["Banking", "IT", "Auto", "Pharma", "FMCG", "Energy"].map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setSearchQuery(sector)}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StockRow({
  symbol,
  name,
  price,
  change,
  isPositive,
  isAdded,
  isPending,
  onToggle,
}: {
  symbol: string
  name: string
  price?: string
  change?: string
  isPositive?: boolean
  isAdded: boolean
  isPending: boolean
  onToggle: () => void
}) {
  const displayName = name || symbolToName(symbol)
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: symbolToColor(symbol) }}
        >
          {symbolToLogo(symbol)}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{symbol}</p>
          <p className="text-xs text-muted-foreground">{displayName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {price && change != null && isPositive != null && (
          <div className="text-right">
            <p className="font-semibold text-foreground text-sm">{price}</p>
            <p className={`text-xs flex items-center justify-end gap-0.5 ${isPositive ? "text-gain" : "text-loss"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : "-"}{change}
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          disabled={isPending}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
            isAdded
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
