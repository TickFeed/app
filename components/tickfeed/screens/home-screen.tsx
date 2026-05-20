"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Bell, TrendingUp, RefreshCw, Layers } from "lucide-react"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { MarketDigest } from "../market-digest"
import { NewsCard } from "../news-card"
import { NewsCarousel } from "../news-carousel"
import { FocusModeCarousel } from "../focus-mode-carousel"
import type { NewsArticle } from "@/app/page"
import {
  getNewsFeed,
  getMarketDigest,
  formatRelativeTime,
  sourceToIcon,
  getUnreadCount,
  API_BASE,
  type FeedItem,
  type MarketDigestResponse,
} from "@/lib/api"
import { usePolling } from "@/hooks/use-polling"

const DIGEST_POLL_MS = 60_000
const FEED_TTL_MS    = 5 * 60_000  // 5 minutes

interface HomeScreenProps {
  token: string
  onNewsClick?: (article: NewsArticle) => void
  onNotificationsClick?: () => void
  onSearchClick?: () => void
}

const TABS = [
  { label: "For You",   tab: "for_you"    as const },
  { label: "My Stocks", tab: "my_stocks"  as const },
  { label: "Focus",     tab: "all"        as const, focus: true },
]

// Module-level cache — survives component unmount/remount on tab switches
// Bump _CACHE_VER whenever the feed response shape changes to auto-bust stale entries
const _CACHE_VER = 2
const _feedCache: Record<string, { items: NewsArticle[]; ts: number }> = {}
const _digestCache: { data: MarketDigestResponse | null; ts: number } = { data: null, ts: 0 }

export function invalidateMyStocksCache() {
  delete _feedCache[`${_CACHE_VER}:1`]
}

function feedItemToArticle(item: FeedItem): NewsArticle {
  return {
    id: String(item.id),
    url: item.url,
    source: { name: item.source, icon: sourceToIcon(item.source) },
    timestamp: formatRelativeTime(item.published ?? item.created_at),
    headline: item.title,
    tags: [],
    aiSummaryAvailable: item.priority === "HIGH",
    commentsCount: item.comments_count ?? 0,
    imageUrl: item.image_url ?? "",
    content: item.summary ?? undefined,
  }
}

export function HomeScreen({ token, onNewsClick, onNotificationsClick, onSearchClick }: HomeScreenProps) {
  const [activeTab,  setActiveTab]  = useState(0)
  const [focusMode,  setFocusMode]  = useState(false)
  const [news,       setNews]       = useState<NewsArticle[]>(_feedCache[`${_CACHE_VER}:0`]?.items ?? [])
  const [digest,     setDigest]     = useState<MarketDigestResponse | null>(_digestCache.data)
  const [loading,    setLoading]    = useState(!_feedCache[`${_CACHE_VER}:0`])
  const [error,      setError]      = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  const enterFocusMode = () => {
    setActiveTab(2)
    setFocusMode(true)
  }

  const exitFocusMode = () => {
    setFocusMode(false)
    setActiveTab(0)
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current = null
    swipeStartY.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    setActiveTab((prev) => {
      const next = prev + (dx < 0 ? 1 : -1)
      if (next < 0 || next > 2) return prev
      if (next === 2) { setFocusMode(true); return 2 }
      setFocusMode(false)
      return next
    })
  }, [])

  // Fetch initial unread count + subscribe to SSE for live updates
  useEffect(() => {
    if (!token) return
    getUnreadCount(token).then(setUnreadCount).catch(() => {})

    const url = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (typeof data.unread_count === "number") setUnreadCount(data.unread_count)
        if (typeof data.count === "number") setUnreadCount(data.count)
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchFeed = useCallback(async (tabIdx: number, force = false) => {
    const cacheKey = `${_CACHE_VER}:${tabIdx}`
    const entry = _feedCache[cacheKey]
    if (!force && entry && Date.now() - entry.ts < FEED_TTL_MS) {
      setNews(entry.items)
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    try {
      const tab   = TABS[tabIdx].tab
      const items = await getNewsFeed(token, tab)
      const mapped = items.map(feedItemToArticle)
      _feedCache[cacheKey] = { items: mapped, ts: Date.now() }
      setNews(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchDigest = useCallback(async (force = false) => {
    if (!force && _digestCache.data && Date.now() - _digestCache.ts < FEED_TTL_MS) {
      setDigest(_digestCache.data)
      return
    }
    try {
      const d = await getMarketDigest(token)
      _digestCache.data = d
      _digestCache.ts   = Date.now()
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
  usePolling(() => fetchDigest(true), DIGEST_POLL_MS, activeTab === 0)

  // Pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    await Promise.all([fetchFeed(activeTab, true), activeTab === 0 ? fetchDigest(true) : Promise.resolve()])
  }, [activeTab, fetchFeed, fetchDigest])
  const { pullState } = usePullToRefresh(scrollRef, handlePullRefresh)

  const digestHeadline = digest?.top_story?.title ?? null
  const digestBrief    = digest?.market_brief ?? null
  const digestDate     = digest?.top_story?.created_at
    ? new Date(digest.top_story.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null
  const indexDigests   = digest?.index_digests ?? {}

  return (
    <div className="flex h-full flex-col bg-background" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Focus mode full-screen overlay */}
      {focusMode && (
        <FocusModeCarousel
          articles={news}
          loading={loading && activeTab === 2}
          onArticleClick={(article) => { exitFocusMode(); onNewsClick?.(article) }}
          onExit={exitFocusMode}
        />
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">Tick</span>
          <span className="text-primary">Feed</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onSearchClick}
            className="rounded-full p-2 text-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={onNotificationsClick}
            className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      <div className={`flex items-center justify-center gap-2 overflow-hidden bg-background transition-all duration-300 ${pullState !== "idle" ? "h-10" : "h-0"}`}>
        <RefreshCw className={`h-4 w-4 text-primary ${pullState === "refreshing" ? "animate-spin" : ""}`} />
        <span className="text-xs text-muted-foreground">
          {pullState === "refreshing" ? "Refreshing…" : "Release to refresh"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {TABS.map((t, i) => (
          <button
            key={t.tab}
            onClick={() => "focus" in t && t.focus ? enterFocusMode() : setActiveTab(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              "focus" in t && t.focus
                ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/30"
                : activeTab === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4 scrollbar-hide">
        {/* Market Digest — For You only */}
        {activeTab === 0 && (digestHeadline || digestBrief || Object.keys(indexDigests).length > 0) && (
          <div className="px-4 pb-4">
            <MarketDigest
              headline={digestHeadline}
              brief={digestBrief}
              dateLabel={digestDate}
              indexDigests={indexDigests}
            />
          </div>
        )}

        {/* News section */}
        <div className="border-t border-border/50">
          {activeTab !== 2 && (
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-semibold text-foreground">
                {activeTab === 0 && "Top News"}
                {activeTab === 1 && "Your Stock Updates"}
              </h2>
              <button
                onClick={enterFocusMode}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Focus mode
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-0">
              {activeTab === 2 ? (
                /* Carousel skeleton */
                <div className="px-4 pb-4">
                  <div className="h-2 w-full rounded bg-muted mb-3 animate-pulse" />
                  <div className="rounded-2xl bg-muted animate-pulse" style={{ height: "calc(100dvh - 274px)", minHeight: "320px" }} />
                </div>
              ) : (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="px-4 py-4 border-b border-border/50 animate-pulse">
                    <div className="flex gap-2 mb-2">
                      <div className="h-3 w-20 rounded bg-muted" />
                      <div className="h-3 w-12 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-full rounded bg-muted mb-1" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                  </div>
                ))
              )}
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
            activeTab === 2 ? (
              /* ── Swipeable carousel for All News ── */
              <NewsCarousel
                articles={news}
                onArticleClick={(article) => onNewsClick?.(article)}
              />
            ) : (
              /* ── Standard list for For You + My Stocks ── */
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
            )
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
