"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, MessageCircle, Sparkles, TrendingUp, RotateCcw } from "lucide-react"
import type { NewsArticle } from "@/app/page"
import { triggerHaptic } from "@/lib/native"

// ── Swipe constants (same feel as NewsCarousel) ────────────────────────────
const SWIPE_THRESHOLD    = 72
const BACK_RAW_THRESHOLD = 80
const VELOCITY_THRESH    = 0.45

// ── Types ──────────────────────────────────────────────────────────────────
interface FocusModeCarouselProps {
  articles: NewsArticle[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onArticleClick: (article: NewsArticle) => void
  onExit: () => void
  onLoadMore?: () => void
}

// ── Main component ─────────────────────────────────────────────────────────
export function FocusModeCarousel({ articles, loading, loadingMore, hasMore, onArticleClick, onExit, onLoadMore }: FocusModeCarouselProps) {
  const [visible,      setVisible]      = useState(false) // for entry animation
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragX,        setDragX]        = useState(0)
  const [isExiting,    setIsExiting]    = useState(false)
  const [isResetting,  setIsResetting]  = useState(false)
  const [enterPhase,   setEnterPhase]   = useState<"init" | "animate" | null>(null)
  const [showHint,     setShowHint]     = useState(true)

  const startXRef      = useRef(0)
  const startTimeRef   = useRef(0)
  const rawDeltaXRef   = useRef(0)
  const isDraggingRef  = useRef(false)
  const hasDraggedRef  = useRef(false)
  const mountedRef     = useRef(true)
  // Refs so advance() closure never goes stale
  const hasMoreRef     = useRef(hasMore)
  const articlesLenRef = useRef(articles.length)
  const onLoadMoreRef  = useRef(onLoadMore)

  useEffect(() => { hasMoreRef.current    = hasMore },        [hasMore])
  useEffect(() => { articlesLenRef.current = articles.length }, [articles.length])
  useEffect(() => { onLoadMoreRef.current  = onLoadMore },     [onLoadMore])

  // Entry animation + hint auto-hide
  useEffect(() => {
    mountedRef.current = true
    requestAnimationFrame(() => { if (mountedRef.current) setVisible(true) })
    const t = setTimeout(() => setShowHint(false), 3500)
    return () => { mountedRef.current = false; clearTimeout(t) }
  }, [])

  const total  = articles.length
  const isDone = currentIndex >= total && !loading && !loadingMore && !hasMore

  // ── Swipe state machine ────────────────────────────────────────────────
  const advance = useCallback(() => {
    if (!mountedRef.current) return
    triggerHaptic("light")
    setShowHint(false)
    setIsExiting(true)
    setTimeout(() => {
      if (!mountedRef.current) return
      setIsResetting(true)
      setCurrentIndex(i => {
        const next = i + 1
        // Trigger next page load when 3 cards from the end
        if (onLoadMoreRef.current && hasMoreRef.current && next >= articlesLenRef.current - 3) {
          onLoadMoreRef.current()
        }
        return next
      })
      setDragX(0)
      setIsExiting(false)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (mountedRef.current) setIsResetting(false)
      }))
    }, 260)
  }, [])

  const goBack = useCallback((idx: number) => {
    if (idx === 0 || !mountedRef.current) return
    setEnterPhase("init")
    setCurrentIndex(i => i - 1)
    setDragX(0)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!mountedRef.current) return
      setEnterPhase("animate")
      setTimeout(() => { if (mountedRef.current) setEnterPhase(null) }, 300)
    }))
  }, [])

  const reset = () => {
    setCurrentIndex(0)
    setDragX(0)
    setIsExiting(false)
    setEnterPhase(null)
    setShowHint(true)
    setTimeout(() => setShowHint(false), 3500)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExiting || enterPhase !== null) return
    startXRef.current     = e.touches[0].clientX
    startTimeRef.current  = Date.now()
    rawDeltaXRef.current  = 0
    isDraggingRef.current = true
    hasDraggedRef.current = false
    setShowHint(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || isExiting || enterPhase !== null) return
    const raw = e.touches[0].clientX - startXRef.current
    rawDeltaXRef.current = raw
    if (Math.abs(raw) > 5) hasDraggedRef.current = true
    setDragX(raw > 0 ? (currentIndex === 0 ? raw * 0.18 : 0) : raw)
  }

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || isExiting || enterPhase !== null) return
    isDraggingRef.current = false
    const raw     = rawDeltaXRef.current
    rawDeltaXRef.current = 0
    const elapsed  = Math.max(1, Date.now() - startTimeRef.current)
    const velocity = Math.abs(dragX) / elapsed

    if (raw > BACK_RAW_THRESHOLD && currentIndex > 0) {
      goBack(currentIndex)
    } else if (dragX < -SWIPE_THRESHOLD || (velocity > VELOCITY_THRESH && dragX < -24)) {
      advance()
    } else {
      setDragX(0)
    }
  }

  const handleCardClick = () => {
    if (hasDraggedRef.current || isDone) return
    onArticleClick(articles[currentIndex])
  }

  // ── Derived values ─────────────────────────────────────────────────────
  const dragProgress = isExiting ? 1 : Math.min(Math.max(0, -dragX) / SWIPE_THRESHOLD, 1)
  const isDragging   = dragX !== 0

  const topTransform = isExiting
    ? "translateX(-115%) rotate(-16deg)"
    : enterPhase === "init"
    ? "translateX(-115%) rotate(-10deg)"
    : `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`
  const topTransition = isExiting
    ? "transform 0.26s ease-in"
    : enterPhase === "init"
    ? "none"
    : enterPhase === "animate"
    ? "transform 0.3s ease-out"
    : (isDragging || isResetting)
    ? "none"
    : "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)"

  const card0 = articles[currentIndex]
  const card1 = articles[currentIndex + 1]
  const card2 = articles[currentIndex + 2]

  // ── Outer shell — entry / exit fade+scale ─────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] bg-background overflow-hidden"
      data-no-swipe
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "scale(1)" : "scale(1.06)",
        transition: "opacity 0.28s ease-out, transform 0.28s ease-out",
      }}
    >
      {/* ── Loading state ──────────────────────────────────────────────── */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20">
          <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading stories…</p>
        </div>
      )}

      {/* ── All-caught-up state ────────────────────────────────────────── */}
      {isDone && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-20 bg-background">
          <div className="mb-6 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2">All Caught Up</h3>
          <p className="text-base text-muted-foreground mb-8">You've read all {total} stories for today.</p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-full border border-border bg-muted px-6 py-3 text-sm font-semibold text-foreground active:scale-95 transition-transform"
            >
              <RotateCcw className="h-4 w-4" />
              Again
            </button>
            <button
              onClick={onExit}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* ── Card stack ─────────────────────────────────────────────────── */}
      {!isDone && !loading && (
        <div className="absolute inset-0">
          {/* Back card */}
          {card2 && (
            <div
              className="absolute inset-0"
              style={{
                zIndex: 1,
                opacity: 0.55,
                transform: isExiting || enterPhase === "init"
                  ? "scale(0.96) translateY(8px)"
                  : "scale(0.90) translateY(22px)",
                transition: (isExiting || enterPhase === "animate") ? "transform 0.3s ease-out" : "none",
              }}
            >
              <FocusCard article={card2} />
            </div>
          )}

          {/* Middle card */}
          {card1 && (
            <div
              className="absolute inset-0"
              style={{
                zIndex: 2,
                transform: isExiting || enterPhase === "init"
                  ? "scale(1) translateY(0)"
                  : "scale(0.96) translateY(8px)",
                transition: (isExiting || enterPhase === "animate") ? "transform 0.3s ease-out" : "none",
              }}
            >
              <FocusCard article={card1} />
            </div>
          )}

          {/* Top card — interactive */}
          <div
            className="absolute inset-0"
            style={{ zIndex: 3, transform: topTransform, transition: topTransition, touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleCardClick}
          >
            <FocusCard article={card0} dragProgress={dragProgress} />
          </div>
        </div>
      )}

      {/* ── HUD: exit + loading — always on top ────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-3 px-4"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "12px" }}
      >
        {/* Loading more indicator */}
        {loadingMore && (
          <div className="shrink-0 h-4 w-4 rounded-full border-2 border-border border-t-primary animate-spin" />
        )}

        {/* Exit pill */}
        <button
          onClick={onExit}
          className="shrink-0 flex items-center gap-1.5 rounded-full bg-muted border border-border pl-2.5 pr-3.5 py-1.5 text-[12px] font-bold text-foreground active:scale-95 transition-transform"
        >
          <X className="h-3.5 w-3.5" />
          Exit
        </button>
      </div>

      {/* ── Swipe hint ─────────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 z-10 flex justify-center pointer-events-none transition-opacity duration-700"
        style={{ top: "52%", transform: "translateY(-50%)", opacity: showHint ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 px-5 py-3 shadow-xl">
          <span className="text-[13px] font-semibold text-white tracking-wide">
            ← swipe to skip &nbsp;·&nbsp; tap to read
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Full-screen article card ───────────────────────────────────────────────
function FocusCard({
  article,
  dragProgress = 0,
}: {
  article: NewsArticle
  dragProgress?: number
}) {
  const [imgError, setImgError] = useState(false)
  const isNse = article.source.name.toLowerCase().includes("nse")
  const imgSrc = (article.imageUrl && !imgError) ? article.imageUrl : (isNse ? "/default-nse.jpg" : "/default-news.svg")

  return (
    <div className="h-full flex flex-col bg-card border border-border/30">

      {/* Image area — 40% of card height */}
      <div className="relative overflow-hidden" style={{ flex: "0 0 40%" }}>
        <img
          src={imgSrc}
          alt={article.headline}
          className="w-full h-full object-cover"
          draggable={false}
          onError={() => setImgError(true)}
        />

        {/* Bottom gradient so pills are readable */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Source pill — bottom left */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/65 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold text-white">
            {article.source.name}
          </span>
        </div>

        {/* AI badge — bottom right (avoids HUD overlap at top) */}
        {article.aiSummaryAvailable && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-primary rounded-full px-2.5 py-[5px] shadow-lg">
            <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground">AI</span>
          </div>
        )}

        {/* Swipe overlay */}
        {dragProgress > 0.12 && (
          <div
            className="absolute inset-0 bg-primary/25 flex items-center justify-center pointer-events-none"
            style={{ opacity: dragProgress }}
          >
            <div
              className="bg-primary rounded-full px-5 py-2.5 shadow-xl"
              style={{ opacity: dragProgress, transform: `scale(${0.8 + dragProgress * 0.2})` }}
            >
              <span className="text-sm font-bold text-primary-foreground">Next →</span>
            </div>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-1 flex-col px-5 pt-5 pb-5 min-h-0">
        <p className="text-[13px] text-muted-foreground mb-3">{article.timestamp}</p>

        <h3 className="text-[22px] font-bold leading-snug text-foreground mb-4">
          {article.headline}
        </h3>

        <div className="flex-1 min-h-0 overflow-hidden">
          {article.content ? (
            <p className="text-[15px] leading-relaxed text-muted-foreground line-clamp-6">
              {article.content}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-sm">AI summary generating…</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span className="text-[15px] font-medium">
              {article.commentsCount > 0
                ? `${article.commentsCount} discussion${article.commentsCount !== 1 ? "s" : ""}`
                : "Be first to discuss"}
            </span>
          </div>
          <span className="text-sm font-semibold text-primary">Read more →</span>
        </div>
      </div>
    </div>
  )
}
