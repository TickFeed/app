"use client"

import { useState } from "react"
import { ArrowLeft, Search, Plus, Check, TrendingUp, TrendingDown } from "lucide-react"

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

// All available stocks to search from
const ALL_STOCKS: Stock[] = [
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd.",
    price: "1,642.55",
    change: "1.28%",
    isPositive: true,
    updatesCount: 6,
    chartData: [40, 42, 38, 45, 48, 52, 50, 55, 58, 62, 60, 65],
    logoColor: "#dc2626",
    logo: "H",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Svcs.",
    price: "3,980.25",
    change: "2.18%",
    isPositive: true,
    updatesCount: 3,
    chartData: [50, 52, 48, 55, 58, 54, 60, 62, 58, 65, 70, 72],
    logoColor: "#1e40af",
    logo: "TCS",
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: "2,945.80",
    change: "0.28%",
    isPositive: false,
    updatesCount: 2,
    chartData: [60, 58, 62, 55, 52, 58, 54, 50, 48, 52, 50, 48],
    logoColor: "#0d9488",
    logo: "R",
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd.",
    price: "1,497.40",
    change: "1.02%",
    isPositive: true,
    updatesCount: 4,
    chartData: [45, 48, 42, 50, 52, 48, 55, 58, 54, 60, 62, 65],
    logoColor: "#2563eb",
    logo: "INF",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd.",
    price: "1,190.60",
    change: "0.65%",
    isPositive: true,
    updatesCount: 3,
    chartData: [52, 55, 50, 58, 60, 55, 62, 65, 60, 68, 70, 72],
    logoColor: "#dc2626",
    logo: "I",
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd.",
    price: "485.30",
    change: "1.45%",
    isPositive: true,
    updatesCount: 2,
    chartData: [30, 32, 28, 35, 38, 34, 40, 42, 38, 45, 48, 50],
    logoColor: "#7c3aed",
    logo: "W",
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    price: "625.80",
    change: "0.92%",
    isPositive: true,
    updatesCount: 5,
    chartData: [42, 45, 40, 48, 50, 46, 52, 55, 50, 58, 60, 62],
    logoColor: "#1d4ed8",
    logo: "SBI",
  },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd.",
    price: "1,245.60",
    change: "0.45%",
    isPositive: false,
    chartData: [55, 52, 58, 50, 48, 52, 50, 46, 44, 48, 45, 42],
    updatesCount: 2,
    logoColor: "#dc2626",
    logo: "BA",
  },
  {
    symbol: "AXISBANK",
    name: "Axis Bank Ltd.",
    price: "1,085.20",
    change: "1.75%",
    isPositive: true,
    updatesCount: 4,
    chartData: [38, 42, 36, 45, 48, 44, 50, 52, 48, 55, 58, 62],
    logoColor: "#7c3aed",
    logo: "A",
  },
  {
    symbol: "KOTAKBANK",
    name: "Kotak Mahindra Bank",
    price: "1,820.45",
    change: "0.38%",
    isPositive: true,
    updatesCount: 2,
    chartData: [48, 50, 46, 52, 54, 50, 56, 58, 54, 60, 62, 64],
    logoColor: "#dc2626",
    logo: "K",
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro Ltd.",
    price: "3,425.70",
    change: "2.05%",
    isPositive: true,
    updatesCount: 3,
    chartData: [40, 44, 38, 48, 52, 46, 54, 58, 52, 60, 65, 68],
    logoColor: "#0d9488",
    logo: "LT",
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki India",
    price: "12,580.30",
    change: "1.12%",
    isPositive: true,
    updatesCount: 2,
    chartData: [45, 48, 42, 50, 54, 48, 56, 58, 54, 62, 65, 68],
    logoColor: "#1e40af",
    logo: "M",
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd.",
    price: "745.60",
    change: "3.25%",
    isPositive: true,
    updatesCount: 5,
    chartData: [35, 40, 32, 45, 50, 42, 52, 58, 50, 60, 68, 72],
    logoColor: "#1e40af",
    logo: "TM",
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical",
    price: "1,125.80",
    change: "0.65%",
    isPositive: false,
    updatesCount: 2,
    chartData: [52, 50, 54, 48, 46, 50, 48, 44, 42, 46, 44, 42],
    logoColor: "#f97316",
    logo: "SP",
  },
  {
    symbol: "HCLTECH",
    name: "HCL Technologies",
    price: "1,385.40",
    change: "1.88%",
    isPositive: true,
    updatesCount: 3,
    chartData: [42, 46, 40, 48, 52, 46, 54, 58, 52, 60, 64, 68],
    logoColor: "#2563eb",
    logo: "HCL",
  },
  {
    symbol: "ASIANPAINT",
    name: "Asian Paints Ltd.",
    price: "2,845.20",
    change: "0.42%",
    isPositive: false,
    updatesCount: 1,
    chartData: [58, 56, 60, 54, 52, 56, 54, 50, 48, 52, 50, 48],
    logoColor: "#f97316",
    logo: "AP",
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd.",
    price: "6,890.50",
    change: "2.45%",
    isPositive: true,
    updatesCount: 4,
    chartData: [38, 42, 36, 46, 50, 44, 52, 58, 50, 60, 66, 72],
    logoColor: "#1d4ed8",
    logo: "BF",
  },
  {
    symbol: "TECHM",
    name: "Tech Mahindra Ltd.",
    price: "1,245.80",
    change: "1.62%",
    isPositive: true,
    updatesCount: 3,
    chartData: [40, 44, 38, 46, 50, 44, 52, 56, 50, 58, 62, 66],
    logoColor: "#dc2626",
    logo: "TM",
  },
]

const TRENDING_STOCKS = ["TATAMOTORS", "BAJFINANCE", "SBIN", "LT", "MARUTI"]

interface AddStockScreenProps {
  onBack: () => void
  onAddStock: (stock: Stock) => void
  watchlistSymbols: string[]
}

export function AddStockScreen({ onBack, onAddStock, watchlistSymbols }: AddStockScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([])

  const filteredStocks = searchQuery.length > 0 
    ? ALL_STOCKS.filter(stock => 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const trendingStocks = ALL_STOCKS.filter(s => TRENDING_STOCKS.includes(s.symbol))

  const handleAddStock = (stock: Stock) => {
    if (!watchlistSymbols.includes(stock.symbol) && !recentlyAdded.includes(stock.symbol)) {
      onAddStock(stock)
      setRecentlyAdded(prev => [...prev, stock.symbol])
    }
  }

  const isInWatchlist = (symbol: string) => 
    watchlistSymbols.includes(symbol) || recentlyAdded.includes(symbol)

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
        {searchQuery.length > 0 ? (
          <>
            {/* Search Results */}
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">
                {filteredStocks.length} {filteredStocks.length === 1 ? "result" : "results"} found
              </p>
            </div>
            <div className="pb-4">
              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
                  <StockSearchItem
                    key={stock.symbol}
                    stock={stock}
                    isAdded={isInWatchlist(stock.symbol)}
                    onAdd={() => handleAddStock(stock)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No stocks found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try searching with a different term
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Trending Stocks */}
            <div className="px-4 pb-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Today
              </p>
            </div>
            <div className="pb-4">
              {trendingStocks.map((stock) => (
                <StockSearchItem
                  key={stock.symbol}
                  stock={stock}
                  isAdded={isInWatchlist(stock.symbol)}
                  onAdd={() => handleAddStock(stock)}
                />
              ))}
            </div>

            {/* Popular Categories */}
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

            {/* All Stocks */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-foreground">All Stocks</p>
            </div>
            <div className="pb-8">
              {ALL_STOCKS.map((stock) => (
                <StockSearchItem
                  key={stock.symbol}
                  stock={stock}
                  isAdded={isInWatchlist(stock.symbol)}
                  onAdd={() => handleAddStock(stock)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StockSearchItem({ 
  stock, 
  isAdded, 
  onAdd 
}: { 
  stock: Stock
  isAdded: boolean
  onAdd: () => void 
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div 
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: stock.logoColor }}
        >
          {stock.logo}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{stock.symbol}</p>
          <p className="text-xs text-muted-foreground">{stock.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-semibold text-foreground text-sm">{stock.price}</p>
          <p className={`text-xs flex items-center justify-end gap-0.5 ${stock.isPositive ? "text-gain" : "text-loss"}`}>
            {stock.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {stock.isPositive ? "+" : "-"}{stock.change}
          </p>
        </div>
        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
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
