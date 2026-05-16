"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Bell, TrendingUp } from "lucide-react"
import { MarketDigest } from "../market-digest"
import { NewsCard } from "../news-card"
import type { NewsArticle } from "@/app/page"
import {
  getNewsFeed,
  getMarketDigest,
  formatRelativeTime,
  sourceToIcon,
  formatPrice,
  formatChangePct,
  type FeedItem,
  type MarketDigestResponse,
} from "@/lib/api"
import { usePolling } from "@/hooks/use-polling"

const PRICE_POLL_MS = 60_000

interface HomeScreenProps {
  token: string
  onNewsClick?: (article: NewsArticle) => void
}

const TABS = [
  { label: "For You", tab: "for_you" as const },
  { label: "My Stocks", tab: "my_stocks" as const },
  { label: "All News", tab: "all" as const },
]

function feedItemToArticle(item: FeedItem): NewsArticle {
  return {
    id: String(item.id),
    url: item.url,
    source: { name: item.source, icon: sourceToIcon(item.source) },
    timestamp: formatRelativeTime(item.published ?? item.created_at),
    headline: item.title,
    tags: item.symbol ? [item.symbol] : [],
    aiSummaryAvailable: item.priority === "HIGH",
    commentsCount: 0,
    imageUrl: "",
    content: item.summary ?? undefined,
  }
}

export function HomeScreen({ token, onNewsClick }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [digest, setDigest] = useState<MarketDigestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchFeed = useCallback(async (tabIdx: number) => {
    setLoading(true)
    setError("")
    try {
      const tab = TABS[tabIdx].tab
      const items = await getNewsFeed(token, tab)
      setNews(items.map(feedItemToArticle))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchDigest = useCallback(async () => {
    try {
      const d = await getMarketDigest(token)
      setDigest(d)
    } catch {
      // digest is non-critical — silently ignore
    }
  }, [token])

  useEffect(() => {
    fetchFeed(activeTab)
    if (activeTab === 0) fetchDigest()
  }, [activeTab, fetchFeed, fetchDigest])

  // Silently refresh market ticker every 60 s while on the For You tab
  usePolling(fetchDigest, PRICE_POLL_MS, activeTab === 0)

  const tickerItems = (digest?.market_ticker ?? []).map((t) => ({
    symbol: t.symbol,
    value: formatPrice(t.price),
    change: formatChangePct(t.change_pct),
    isPositive: t.is_positive,
  }))

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">Tick</span>
          <span className="text-primary">Feed</span>
        </h1>
        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 text-foreground hover:bg-muted transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {TABS.map((t, i) => (
          <button
            key={t.tab}
            onClick={() => setActiveTab(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Market Digest — For You only */}
        {activeTab === 0 && tickerItems.length > 0 && (
          <div className="px-4 pb-4">
            <MarketDigest items={tickerItems} brief={digest?.market_brief} />
          </div>
        )}

        {/* News section */}
        <div className="border-t border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">
                {activeTab === 0 && "Top News"}
                {activeTab === 1 && "Your Stock Updates"}
                {activeTab === 2 && "Latest News"}
              </h2>
              {activeTab === 2 && !loading && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {news.length} articles
                </span>
              )}
            </div>
            {activeTab !== 2 && (
              <button
                onClick={() => setActiveTab(2)}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                View all
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-4 py-4 border-b border-border/50 animate-pulse">
                  <div className="flex gap-2 mb-2">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-3 w-12 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-full rounded bg-muted mb-1" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-muted-foreground">{error}</p>
              <button
                onClick={() => fetchFeed(activeTab)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : news.length > 0 ? (
            <div>
              {news.map((item) => (
                <NewsCard
                  key={item.id}
                  source={item.source}
                  timestamp={item.timestamp}
                  headline={item.headline}
                  tags={item.tags}
                  aiSummaryAvailable={item.aiSummaryAvailable}
                  commentsCount={item.commentsCount}
                  imageUrl={item.imageUrl}
                  onClick={() => onNewsClick?.(item)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No news available</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Check back later for updates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
