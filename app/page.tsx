"use client"

import { useState } from "react"
import { HomeScreen } from "@/components/tickfeed/screens/home-screen"
import { WatchlistScreen } from "@/components/tickfeed/screens/watchlist-screen"
import { StockDetailScreen } from "@/components/tickfeed/screens/stock-detail-screen"
import { AddStockScreen } from "@/components/tickfeed/screens/add-stock-screen"
import { ArticleDetailScreen } from "@/components/tickfeed/screens/article-detail-screen"
import { CommunityScreen } from "@/components/tickfeed/screens/community-screen"
import { ProfileScreen } from "@/components/tickfeed/screens/profile-screen"
import { BottomNav } from "@/components/tickfeed/bottom-nav"

export type Screen = "home" | "watchlist" | "stock-detail" | "add-stock" | "community" | "profile" | "article-detail"

export interface NewsArticle {
  id: string
  source: { name: string; icon: string }
  timestamp: string
  headline: string
  tags: string[]
  aiSummaryAvailable: boolean
  commentsCount: number
  imageUrl: string
  content?: string
}

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

const INITIAL_STOCKS: Stock[] = [
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
]

export default function TickFeedApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [previousScreen, setPreviousScreen] = useState<Screen>("home")
  const [activeTab, setActiveTab] = useState("home")
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "home") setCurrentScreen("home")
    else if (tab === "watchlist") setCurrentScreen("watchlist")
    else if (tab === "community") setCurrentScreen("community")
    else if (tab === "profile") setCurrentScreen("profile")
  }

  const handleNewsClick = (article: NewsArticle) => {
    setSelectedArticle(article)
    setPreviousScreen(currentScreen)
    setCurrentScreen("article-detail")
  }

  const handleBackFromArticle = () => {
    setCurrentScreen(previousScreen)
    setSelectedArticle(null)
  }

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol)
    setPreviousScreen(currentScreen)
    setCurrentScreen("stock-detail")
  }

  const handleBackFromStock = () => {
    setCurrentScreen("watchlist")
    setSelectedStock(null)
  }

  const handleRemoveStock = (symbol: string) => {
    setStocks(prev => prev.filter(s => s.symbol !== symbol))
  }

  const handleAddStockScreen = () => {
    setPreviousScreen(currentScreen)
    setCurrentScreen("add-stock")
  }

  const handleAddStock = (stock: Stock) => {
    setStocks(prev => {
      if (prev.some(s => s.symbol === stock.symbol)) return prev
      return [...prev, stock]
    })
  }

  const handleBackFromAddStock = () => {
    setCurrentScreen("watchlist")
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNewsClick={handleNewsClick} />
      case "watchlist":
        return (
          <WatchlistScreen 
            stocks={stocks}
            onStockClick={handleStockClick}
            onAddStock={handleAddStockScreen}
          />
        )
      case "add-stock":
        return (
          <AddStockScreen
            onBack={handleBackFromAddStock}
            onAddStock={handleAddStock}
            watchlistSymbols={stocks.map(s => s.symbol)}
          />
        )
      case "stock-detail":
        return selectedStock ? (
          <StockDetailScreen 
            symbol={selectedStock} 
            onBack={handleBackFromStock}
            onRemove={handleRemoveStock}
          />
        ) : null
      case "article-detail":
        return selectedArticle ? (
          <ArticleDetailScreen article={selectedArticle} onBack={handleBackFromArticle} />
        ) : null
      case "community":
        return <CommunityScreen />
      case "profile":
        return <ProfileScreen />
      default:
        return <HomeScreen onNewsClick={handleNewsClick} />
    }
  }

  const showBottomNav = currentScreen !== "article-detail" && currentScreen !== "stock-detail" && currentScreen !== "add-stock"

  return (
    <div className="flex h-[100dvh] flex-col bg-background dark">
      <div className="flex-1 overflow-hidden">
        {renderScreen()}
      </div>
      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
    </div>
  )
}
