"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft,
  Bell,
  BellOff,
  Newspaper,
  Sparkles,
  ChevronRight,
  Minus,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import {
  getStockDetail,
  removeFromWatchlist,
  formatRelativeTime,
  symbolToColor,
  symbolToLogo,
  type StockDetail,
} from "@/lib/api"
import { AiChatTab } from "@/components/tickfeed/ai-chat-tab"
import { DiscussTab } from "@/components/tickfeed/discuss-tab"

type ActiveTab = "overview" | "ai-chat" | "discuss"

interface StockDetailScreenProps {
  token: string
  symbol: string
  onBack: () => void
  initialTab?: ActiveTab
}

export function StockDetailScreen({ token, symbol, onBack, initialTab }: StockDetailScreenProps) {
  const [stock, setStock] = useState<StockDetail | null>(null)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadingStock, setLoadingStock] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab ?? "overview")

  useEffect(() => {
    async function load() {
      setLoadingStock(true)
      setError("")
      try {
        const detail = await getStockDetail(token, symbol)
        setStock(detail)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stock data")
      } finally {
        setLoadingStock(false)
      }
    }
    load()
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

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "ai-chat", label: "Ask AI", icon: Sparkles },
    { id: "discuss", label: "Discuss", icon: MessageSquare },
  ]

  const suggestedQuestions = [
    { q: `What's the outlook for ${symbol}?`, icon: "📈" },
    { q: `RSI and MACD for ${symbol}?`, icon: "📊" },
    { q: `Key support and resistance levels?`, icon: "🎯" },
    { q: `Compare with sector peers`, icon: "⚖️" },
  ]

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
        </div>
      </header>

      {/* Company identity card */}
      <div className="px-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-base"
            style={{ backgroundColor: symbolToColor(stock.symbol) }}
          >
            {symbolToLogo(stock.symbol)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{stock.symbol}</h1>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
            {(stock.sector || stock.industry) && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {[stock.sector, stock.industry].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-background sticky top-[57px] z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="flex-1 overflow-y-auto">
          {/* Related News */}
          {stock.related_news.length > 0 && (
            <div className="px-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" />
                  Related News
                </h2>
              </div>
              <div className="space-y-2">
                {stock.related_news.slice(0, 5).map((news) => (
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

          {/* AI Insights prompt */}
          <div className="px-4 mt-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">AI Insights</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask our AI about {stock.symbol}&apos;s fundamentals, technicals, sector trends, and more.
                {stock.sector ? ` Sector: ${stock.sector}.` : ""}
              </p>
              <button
                onClick={() => setActiveTab("ai-chat")}
                className="mt-3 text-xs font-medium text-primary flex items-center gap-1"
              >
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
      )}

      {activeTab === "ai-chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          <AiChatTab
            token={token}
            mode="stock"
            contextId={symbol}
            isActive={activeTab === "ai-chat"}
            welcomeMessage={`Hi! Ask me anything about ${symbol} or Indian markets — technicals, fundamentals, outlook, and more.`}
            suggestedQuestions={suggestedQuestions}
            chatEndpoint={`/api/stocks/${encodeURIComponent(symbol)}/chat`}
          />
        </div>
      )}

      {activeTab === "discuss" && (
        <div className="flex-1 flex flex-col min-h-0">
          <DiscussTab
            token={token}
            symbol={symbol}
            contextLabel={symbol}
            isActive={activeTab === "discuss"}
          />
        </div>
      )}
    </div>
  )
}
