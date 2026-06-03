"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft,
  Newspaper,
  Sparkles,
  ChevronRight,
  Minus,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  getStockDetail,
  removeFromWatchlist,
  formatRelativeTime,
  symbolToColor,
  symbolToLogo,
  sourceToIcon,
  type StockDetail,
} from "@/lib/api"
import { AiChatTab } from "@/components/tickfeed/ai-chat-tab"
import { DiscussTab } from "@/components/tickfeed/discuss-tab"
import type { NewsArticle } from "@/app/page"

type ActiveTab = "overview" | "ai-chat" | "discuss"

interface StockDetailScreenProps {
  token: string
  symbol: string
  onBack: () => void
  onArticleClick?: (article: NewsArticle) => void
  initialTab?: ActiveTab
}

export function StockDetailScreen({ token, symbol, onBack, onArticleClick, initialTab }: StockDetailScreenProps) {
  const [stock, setStock] = useState<StockDetail | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadingStock, setLoadingStock] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab ?? "overview")
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined)
  const [discussCount, setDiscussCount] = useState<number | null>(null)

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

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ElementType; count?: number | null }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "ai-chat", label: "Ask AI", icon: Sparkles },
    { id: "discuss", label: "Discuss", icon: MessageSquare, count: discussCount },
  ]

  const suggestedQuestions = [
    { q: `Outlook for ${symbol}?` },
    { q: `${symbol}'s recent financials?` },
    { q: `Key risks for ${symbol}?` },
    { q: `${symbol} vs sector peers?` },
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
            {tab.count != null && tab.count > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="flex-1 overflow-y-auto pb-6">

          {/* Stock vitals pills */}
          <div className="px-4 pt-4 flex flex-wrap gap-2">
            {stock.sector && (
              <span className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                <TrendingUp className="h-3 w-3" />
                {stock.sector}
              </span>
            )}
            {stock.industry && (
              <span className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                {stock.industry}
              </span>
            )}
            <span className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">
              NSE · BSE
            </span>
          </div>

          {/* What investors are asking */}
          <div className="px-4 mt-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What investors are asking
            </h2>
            <div className="space-y-2">
              {suggestedQuestions.map((sq, i) => (
                <button
                  key={sq.q}
                  onClick={() => { setPendingQuestion(sq.q); setActiveTab("ai-chat") }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-card border border-border text-left active:bg-primary/5 active:border-primary/30 active:scale-[0.99] transition-all group"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-foreground/80">{sq.q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-active:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Related news */}
          {stock.related_news.length > 0 && (
            <div className="px-4 mt-6">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Newspaper className="h-4 w-4 text-primary" />
                Recent News
              </h2>
              <div className="space-y-2">
                {stock.related_news.slice(0, 5).map((news) => (
                  <button
                    key={news.id}
                    className="w-full p-3 rounded-xl bg-card border border-border text-left flex items-start justify-between gap-2 active:bg-muted/60 active:scale-[0.99] transition-all"
                    onClick={() => onArticleClick?.({
                      id: String(news.id),
                      url: news.url,
                      source: { name: news.source, icon: sourceToIcon(news.source) },
                      timestamp: formatRelativeTime(news.created_at),
                      headline: news.title,
                      tags: [],
                      aiSummaryAvailable: !!news.summary,
                      commentsCount: 0,
                      imageUrl: "",
                    })}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{news.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {news.source} · {formatRelativeTime(news.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Community teaser */}
          <div className="px-4 mt-5">
            <button
              onClick={() => setActiveTab("discuss")}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Join the discussion</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    See what investors are saying about {stock.symbol}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary shrink-0 ml-2" />
            </button>
          </div>

          {/* Remove from Watchlist */}
          <div className="px-4 mt-5">
            {!showRemoveConfirm ? (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="w-full p-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
              >
                <Minus className="h-4 w-4" />
                Remove from Watchlist
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
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
                    className="flex-1 py-2 rounded-lg bg-destructive text-sm font-medium text-white disabled:opacity-60"
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
            welcomeMessage={`Hi! Ask me anything about ${symbol} — fundamentals, sector trends, financials, risks, and news impact. I can reference publicly available data from NSE, Screener.in, and company filings, with source attribution. For real-time prices, check NSE or Moneycontrol directly.`}
            suggestedQuestions={suggestedQuestions}
            chatEndpoint={`/api/stocks/${encodeURIComponent(symbol)}/chat`}
            initialQuestion={pendingQuestion}
          />
        </div>
      )}

      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === "discuss" ? "" : "hidden"}`}>
        <DiscussTab
          token={token}
          symbol={symbol}
          contextLabel={symbol}
          isActive={activeTab === "discuss"}
          onCountChange={setDiscussCount}
        />
      </div>
    </div>
  )
}
