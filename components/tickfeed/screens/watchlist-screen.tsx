"use client"

import { useState } from "react"
import { Plus, SlidersHorizontal, Search, TrendingUp, TrendingDown } from "lucide-react"
import { StockCard } from "../stock-card"

interface Stock {
  symbol: string
  name: string
  price: string
  change: string
  isPositive: boolean
  updatesCount: number
  chartData: number[]
  logoColor: string
  logo: string
}

interface WatchlistScreenProps {
  stocks: Stock[]
  onStockClick?: (symbol: string) => void
  onAddStock?: () => void
}

export function WatchlistScreen({ stocks, onStockClick, onAddStock }: WatchlistScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate portfolio stats
  const totalGainers = stocks.filter(s => s.isPositive).length
  const totalLosers = stocks.filter(s => !s.isPositive).length

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">My Stocks</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddStock}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Portfolio Summary */}
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

      {/* Search */}
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

      {/* Stock Count */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground">
          {filteredStocks.length} {filteredStocks.length === 1 ? "stock" : "stocks"} in watchlist
        </p>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto pb-4">
        {filteredStocks.length > 0 ? (
          filteredStocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name}
              price={stock.price}
              change={stock.change}
              isPositive={stock.isPositive}
              updatesCount={stock.updatesCount}
              chartData={stock.chartData}
              logo={stock.logo}
              logoColor={stock.logoColor}
              onClick={() => onStockClick?.(stock.symbol)}
            />
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
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
