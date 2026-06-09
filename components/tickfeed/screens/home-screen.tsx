"use client"

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Search, Bell, TrendingUp, RefreshCw, Layers, SlidersHorizontal, X, Calendar, ChevronRight, Flame } from "lucide-react"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { MarketDigest } from "../market-digest"
import { NewsCard } from "../news-card"
import { FocusModeCarousel } from "../focus-mode-carousel"
import type { NewsArticle } from "@/app/page"
import {
  getNewsFeed,
  getMarketDigest,
  getWatchlist,
  getWatchlistEvents,
  formatRelativeTime,
  sourceToIcon,
  getUnreadCount,
  API_BASE,
  type FeedItem,
  type MarketDigestResponse,
  type WatchlistItem,
  type StockEvent,
} from "@/lib/api"
import { usePolling } from "@/hooks/use-polling"

const DIGEST_POLL_MS = 60_000
const FEED_TTL_MS    = 5 * 60_000  // 5 minutes

interface HomeScreenProps {
  token: string
  streakCount?: number
  requestedTab?: number
  onStreakBadgeClick?: () => void
  onNewsClick?: (article: NewsArticle) => void
  onNotificationsClick?: () => void
  onSearchClick?: () => void
}

const TABS = [
  { label: "For You",   tab: "for_you"    as const },
  { label: "My Stocks", tab: "my_stocks"  as const },
  { label: "Focus",     tab: "all"        as const, focus: true },
]

// Module-level cache + persisted state — survives component unmount/remount
const _CACHE_VER = 4
let _persistedTab        = 0
let _persistedFocusMode  = false
let _showMyStocksCallout = false
const _feedCache: Record<string, { items: NewsArticle[]; ts: number }> = {}
const _digestCache: { data: MarketDigestResponse | null; ts: number } = { data: null, ts: 0 }

export function invalidateMyStocksCache() {
  delete _feedCache[`${_CACHE_VER}:1`]
}

export function showMyStocksOnboardingCallout() {
  _showMyStocksCallout = true
}

export function setHomeTabToFocus() {
  _persistedTab       = 2
  _persistedFocusMode = true
}


function feedItemToArticle(item: FeedItem): NewsArticle {
  return {
    id: String(item.id),
    url: item.url,
    source: { name: item.source, icon: sourceToIcon(item.source) },
    timestamp: formatRelativeTime(item.published ?? item.created_at),
    headline: item.title,
    tags: [],
    aiSummaryAvailable: !!item.summary,
    commentsCount: item.comments_count ?? 0,
    imageUrl: item.image_url ?? "",
    content: item.summary ?? undefined,
    affectedSymbol: item.symbol ?? undefined,
  }
}

export function HomeScreen({ token, streakCount: streakCountProp = 0, requestedTab, onStreakBadgeClick, onNewsClick, onNotificationsClick, onSearchClick }: HomeScreenProps) {
  const [activeTab,            setActiveTab]            = useState(_persistedTab)
  const [focusMode,            setFocusMode]            = useState(_persistedFocusMode)
  const [myStocksCallout,      setMyStocksCallout]      = useState(_showMyStocksCallout)

  useEffect(() => {
    if (requestedTab != null) {
      changeTab(requestedTab)
      if (_showMyStocksCallout) setMyStocksCallout(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab])

  // Per-tab news state (both panels always rendered)
  const [tab0News,    setTab0News]    = useState<NewsArticle[]>(_feedCache[`${_CACHE_VER}:0`]?.items ?? [])
  const [tab1News,    setTab1News]    = useState<NewsArticle[]>(_feedCache[`${_CACHE_VER}:1`]?.items ?? [])
  const [tab0Loading, setTab0Loading] = useState(!_feedCache[`${_CACHE_VER}:0`])
  const [tab1Loading, setTab1Loading] = useState(!_feedCache[`${_CACHE_VER}:1`])
  const [tab0Error,   setTab0Error]   = useState("")
  const [tab1Error,   setTab1Error]   = useState("")

  const [digest,          setDigest]          = useState<MarketDigestResponse | null>(_digestCache.data)
  const [unreadCount,     setUnreadCount]     = useState(0)
  const streakCount = streakCountProp
  const [focusArticles,   setFocusArticles]   = useState<NewsArticle[]>([])
  const [focusPage,       setFocusPage]       = useState(1)
  const [focusHasMore,    setFocusHasMore]    = useState(true)
  const [focusLoading,    setFocusLoading]    = useState(false)
  const [focusLoadingMore, setFocusLoadingMore] = useState(false)
  const [stockFilter,     setStockFilter]     = useState<string | null>(null)
  const [showStockFilterSheet, setShowStockFilterSheet] = useState(false)
  const [watchlist,       setWatchlist]       = useState<WatchlistItem[]>([])
  const [stockEvents,     setStockEvents]     = useState<StockEvent[]>([])
  const [selectedEvent,   setSelectedEvent]   = useState<StockEvent | null>(null)

  // Swipe tracking
  const [tabSwipeDx,    setTabSwipeDx]    = useState(0)
  const [isSwipingTabs, setIsSwipingTabs] = useState(false)

  // Scroll refs — one per tab panel, plus a switching ref for pull-to-refresh
  const scrollRef0     = useRef<HTMLDivElement>(null)
  const scrollRef1     = useRef<HTMLDivElement>(null)
  const pullScrollRef  = useRef<HTMLDivElement | null>(null)

  // Swipe gesture refs
  const swipeStartX    = useRef<number | null>(null)
  const swipeStartY    = useRef<number | null>(null)
  const swipeIsHoriz   = useRef<boolean | null>(null) // null=undecided, true=horiz, false=vert

  // Refs so callbacks never go stale
  const fetchFocusPageRef    = useRef<typeof fetchFocusPage | null>(null)
  const focusArticlesLenRef  = useRef(0)
  const hasMoreRef           = useRef(focusHasMore)
  const articlesLenRef       = useRef(focusArticles.length)
  const onLoadMoreRef        = useRef<(() => void) | null>(null)

  // Keep pull-to-refresh ref pointing at the active panel's scroll container
  useLayoutEffect(() => {
    pullScrollRef.current = activeTab === 0 ? scrollRef0.current : scrollRef1.current
  }, [activeTab])

  const fetchFocusPage = useCallback(async (page: number) => {
    if (page === 1) setFocusLoading(true)
    else setFocusLoadingMore(true)
    try {
      const items  = await getNewsFeed(token, "all", page)
      const mapped = items.map(feedItemToArticle)
      setFocusArticles(prev => page === 1 ? mapped : [...prev, ...mapped])
      setFocusPage(page)
      setFocusHasMore(mapped.length === 20)
    } catch {
      // non-critical
    } finally {
      setFocusLoading(false)
      setFocusLoadingMore(false)
    }
  }, [token])

  // Keep refs in sync
  useEffect(() => { fetchFocusPageRef.current    = fetchFocusPage },              [fetchFocusPage])
  useEffect(() => { focusArticlesLenRef.current  = focusArticles.length },        [focusArticles.length])
  useEffect(() => { hasMoreRef.current           = focusHasMore },                [focusHasMore])
  useEffect(() => { articlesLenRef.current       = focusArticles.length },        [focusArticles.length])

  const loadMoreFocus = useCallback(() => {
    if (focusLoadingMore || !focusHasMore) return
    fetchFocusPage(focusPage + 1)
  }, [focusLoadingMore, focusHasMore, focusPage, fetchFocusPage])

  useEffect(() => { onLoadMoreRef.current = loadMoreFocus }, [loadMoreFocus])

  const changeTab = (tab: number) => {
    _persistedTab = tab
    setActiveTab(tab)
  }

  const enterFocusMode = () => {
    _persistedFocusMode = true
    changeTab(2)
    setFocusMode(true)
    if (focusArticlesLenRef.current === 0) fetchFocusPage(1)
  }

  const exitFocusMode = () => {
    _persistedFocusMode = false
    setFocusMode(false)
    changeTab(0)
  }

  // On mount: if persisted focus mode was active, fetch articles immediately
  useEffect(() => {
    if (_persistedFocusMode && focusArticlesLenRef.current === 0) {
      fetchFocusPage(1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Touch handlers for tab swiping ──────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as Element).closest("[data-no-swipe]")) return
    swipeStartX.current  = e.touches[0].clientX
    swipeStartY.current  = e.touches[0].clientY
    swipeIsHoriz.current = null
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (focusMode) return
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.touches[0].clientX - swipeStartX.current
    const dy = e.touches[0].clientY - swipeStartY.current

    // Decide gesture direction on first significant movement
    if (swipeIsHoriz.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      swipeIsHoriz.current = Math.abs(dx) > Math.abs(dy)
    }

    if (!swipeIsHoriz.current) return

    // Clamp: can't swipe further than one tab away
    const clampedDx = _persistedTab === 0
      ? Math.min(0, dx)          // on tab 0: only left swipe allowed
      : _persistedTab === 1
      ? Math.max(0, dx)          // on tab 1: only right swipe allowed (focus via button)
      : dx

    setIsSwipingTabs(true)
    setTabSwipeDx(clampedDx)
  }, [focusMode])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current  = null
    swipeStartY.current  = null
    swipeIsHoriz.current = null

    // Reset live swipe — CSS transition will animate to final position
    setIsSwipingTabs(false)
    setTabSwipeDx(0)

    if (focusMode) return
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return

    setActiveTab((prev) => {
      const next = prev + (dx < 0 ? 1 : -1)
      if (next < 0 || next > 2) return prev
      if (next === 2) {
        _persistedFocusMode = true
        _persistedTab = 2
        setFocusMode(true)
        if (focusArticlesLenRef.current === 0) fetchFocusPageRef.current?.(1)
        return 2
      }
      _persistedFocusMode = false
      _persistedTab = next
      setFocusMode(false)
      return next
    })
  }, [focusMode])

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

  const fetchFeed = useCallback(async (tabIdx: 0 | 1, force = false) => {
    const cacheKey = `${_CACHE_VER}:${tabIdx}`
    const entry    = _feedCache[cacheKey]
    const setNews    = tabIdx === 0 ? setTab0News    : setTab1News
    const setLoading = tabIdx === 0 ? setTab0Loading : setTab1Loading
    const setError   = tabIdx === 0 ? setTab0Error   : setTab1Error

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

  // Load both tabs on mount + active-tab-specific extras
  useEffect(() => {
    fetchFeed(0)
    fetchFeed(1)
    fetchDigest()
    getWatchlist(token).then(setWatchlist).catch(() => {})
    getWatchlistEvents(token).then(setStockEvents).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // On tab switch: re-fetch active tab (respects cache TTL) + refresh side data
  useEffect(() => {
    fetchFeed(activeTab < 2 ? activeTab as 0 | 1 : 0)
    if (activeTab === 0) fetchDigest()
    if (activeTab === 1) {
      if (watchlist.length === 0) getWatchlist(token).then(setWatchlist).catch(() => {})
      getWatchlistEvents(token).then(setStockEvents).catch(() => {})
    }
    setStockFilter(null)
    setShowStockFilterSheet(false)
  }, [activeTab, fetchFeed, fetchDigest]) // eslint-disable-line react-hooks/exhaustive-deps

  // Silently refresh market ticker every 60 s while on the For You tab
  usePolling(() => fetchDigest(true), DIGEST_POLL_MS, activeTab === 0)

  // Pull-to-refresh — always attached to the active panel
  const handlePullRefresh = useCallback(async () => {
    const tab = activeTab < 2 ? activeTab as 0 | 1 : 0
    await Promise.all([fetchFeed(tab, true), tab === 0 ? fetchDigest(true) : Promise.resolve()])
  }, [activeTab, fetchFeed, fetchDigest])
  const { pullState } = usePullToRefresh(pullScrollRef as React.RefObject<HTMLElement>, handlePullRefresh, activeTab)

  const digestHeadline = digest?.top_story?.title ?? null
  const digestBrief    = digest?.market_brief ?? null
  const digestDate     = digest?.top_story?.created_at
    ? new Date(digest.top_story.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null
  const indexDigests = digest?.index_digests ?? {}

  // CSS transform for each tab panel (0 and 1)
  // translateX(calc((panelIdx - activeTab) * 100% + tabSwipeDx))
  // But capped so tab 2 (focus) just shows panel 0 underneath the overlay
  const tabOffset = Math.min(activeTab, 1)
  const panelTransition = isSwipingTabs ? "none" : "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)"

  const panel0Transform = `translateX(calc(${0 - tabOffset} * 100% + ${tabSwipeDx}px))`
  const panel1Transform = `translateX(calc(${1 - tabOffset} * 100% + ${tabSwipeDx}px))`

  return (
    <div className="flex h-full flex-col bg-background" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Focus mode full-screen overlay */}
      {focusMode && (
        <FocusModeCarousel
          articles={focusArticles}
          loading={focusLoading}
          loadingMore={focusLoadingMore}
          hasMore={focusHasMore}
          onArticleClick={(article) => { exitFocusMode(); onNewsClick?.(article) }}
          onExit={exitFocusMode}
          onLoadMore={loadMoreFocus}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">Tick</span>
          <span className="text-primary">Feed</span>
        </h1>
        <div className="flex items-center gap-2">
          {streakCount > 0 && (
            <button
              onClick={onStreakBadgeClick}
              className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 border border-orange-500/20 active:scale-95 transition-transform"
            >
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-500 tabular-nums">{streakCount}</span>
            </button>
          )}
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
            onClick={() => "focus" in t && t.focus ? enterFocusMode() : changeTab(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === i && "focus" in t && t.focus
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30"
                : activeTab === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 2-panel sliding content area ─────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">

        {/* ── Panel 0: For You ──────────────────────────────────────────── */}
        <div
          ref={scrollRef0}
          className="absolute inset-0 overflow-y-auto pb-4 scrollbar-hide"
          style={{ transform: panel0Transform, transition: panelTransition }}
        >
          {/* Market Digest */}
          {(digestHeadline || digestBrief || Object.keys(indexDigests).length > 0) && (
            <div className="px-4 pb-4" data-no-swipe>
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
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-semibold text-foreground">Top News</h2>
              <button
                onClick={enterFocusMode}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Focus mode
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>

            {tab0Loading ? (
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
            ) : tab0Error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-muted-foreground">{tab0Error}</p>
                <button onClick={() => fetchFeed(0)} className="mt-3 text-sm text-primary hover:underline">
                  Try again
                </button>
              </div>
            ) : tab0News.length > 0 ? (
              <div>
                {tab0News.map((item) => (
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

        {/* ── Panel 1: My Stocks ───────────────────────────────────────── */}
        <div
          ref={scrollRef1}
          className="absolute inset-0 overflow-y-auto pb-4 scrollbar-hide"
          style={{ transform: panel1Transform, transition: panelTransition }}
        >
          {/* Upcoming Events strip */}
          {stockEvents.length > 0 && (
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Upcoming Events
              </p>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide" data-no-swipe>
                {stockEvents.map((ev) => {
                  const evDate   = new Date(ev.event_date + "T00:00:00")
                  const todayMs  = new Date().setHours(0, 0, 0, 0)
                  const diffDays = Math.round((evDate.getTime() - todayMs) / 86400000)
                  const dateLabel = diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow"
                    : evDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  const label = ev.event_type.replace("_", " ")
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="shrink-0 flex flex-col gap-1 rounded-2xl border border-border bg-muted/60 px-3.5 py-2.5 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black text-foreground">{ev.symbol}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-semibold capitalize text-primary">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* News section */}
          <div className="border-t border-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-semibold text-foreground">Your Stock Updates</h2>
              {!tab1Loading && (() => {
                const symbols = watchlist.map(w => w.symbol)
                if (symbols.length < 2) return null
                return (
                  <button
                    onClick={() => setShowStockFilterSheet(true)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      stockFilter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    {stockFilter ?? "Filter"}
                    {stockFilter && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setStockFilter(null) }}
                        className="ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                )
              })()}
            </div>

            {tab1Loading ? (
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
            ) : tab1Error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-muted-foreground">{tab1Error}</p>
                <button onClick={() => fetchFeed(1)} className="mt-3 text-sm text-primary hover:underline">
                  Try again
                </button>
              </div>
            ) : tab1News.length > 0 ? (
              <div>
                {(() => {
                  const filtered = stockFilter
                    ? tab1News.filter(a => a.affectedSymbol === stockFilter)
                    : tab1News
                  if (filtered.length === 0 && stockFilter) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <TrendingUp className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No recent news for {stockFilter}</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Check back later for updates</p>
                      </div>
                    )
                  }
                  return filtered.map((item) => (
                    <NewsCard
                      key={item.id}
                      source={item.source}
                      timestamp={item.timestamp}
                      headline={item.headline}
                      tags={item.tags}
                      aiSummaryAvailable={item.aiSummaryAvailable}
                      commentsCount={item.commentsCount}
                      imageUrl={item.imageUrl}
                      affectedSymbol={item.affectedSymbol}
                      onClick={() => onNewsClick?.(item)}
                    />
                  ))
                })()}
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

      {/* My Stocks onboarding popup — shown once after watchlist wizard */}
      {myStocksCallout && createPortal((
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => { _showMyStocksCallout = false; setMyStocksCallout(false) }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="w-full max-w-sm rounded-2xl bg-background shadow-xl">
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Welcome to My Stocks</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Everything here is personalised to you.</p>
                </div>
                <button
                  onClick={() => { _showMyStocksCallout = false; setMyStocksCallout(false) }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors -mt-0.5 -mr-1 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 pb-4 space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border px-3.5 py-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Your stock news</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Only articles about your watchlist stocks — no noise.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border px-3.5 py-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">NSE corporate events</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Earnings, dividends, AGMs &amp; board meetings for your stocks — shown at the top.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border px-3.5 py-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Market open &amp; close alerts</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Notified on trading days with top news for your stocks.</p>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => { _showMyStocksCallout = false; setMyStocksCallout(false) }}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      ), document.body)}

      {/* Event detail bottom sheet */}
      {selectedEvent && createPortal((
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedEvent(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", maxHeight: "75dvh" }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div>
                <span className="font-bold text-foreground">{selectedEvent.symbol}</span>
                <span className="ml-2 text-sm text-muted-foreground capitalize">{selectedEvent.event_type.replace("_", " ").toLowerCase()}</span>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: "calc(75dvh - 65px)" }}>
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Event Date</p>
                  <p className="text-sm font-bold text-foreground">
                    {new Date(selectedEvent.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {selectedEvent.record_date && (
                  <div className="flex-1 rounded-xl bg-muted/50 border border-border/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Record Date</p>
                    <p className="text-sm font-bold text-foreground">
                      {new Date(selectedEvent.record_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              {selectedEvent.ai_summary ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">What this means</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedEvent.ai_summary}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">AI summary coming soon</p>
              )}
            </div>
          </div>
        </>
      ), document.body)}

      {/* Stock filter bottom sheet */}
      {showStockFilterSheet && createPortal((() => {
        const symbols = watchlist.map(w => w.symbol)
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowStockFilterSheet(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <span className="font-semibold text-foreground">Filter by Stock</span>
                <button
                  onClick={() => setShowStockFilterSheet(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 pt-2 pb-4 max-h-72 overflow-y-auto">
                <button
                  onClick={() => { setStockFilter(null); setShowStockFilterSheet(false) }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors ${
                    stockFilter === null ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">All stocks</span>
                  {stockFilter === null && <div className="h-2 w-2 rounded-full bg-primary" />}
                </button>
                {symbols.map(sym => (
                  <button
                    key={sym}
                    onClick={() => { setStockFilter(sym); setShowStockFilterSheet(false) }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 transition-colors ${
                      stockFilter === sym ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="text-sm font-medium">{sym}</span>
                    {stockFilter === sym && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )
      })(), document.body)}
    </div>
  )
}
