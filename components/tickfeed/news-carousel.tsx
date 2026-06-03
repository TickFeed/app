"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MessageCircle, Sparkles, TrendingUp, RotateCcw } from "lucide-react"
import type { NewsArticle } from "@/app/page"
import { triggerHaptic } from "@/lib/native"

// ── Tuning knobs ───────────────────────────────────────────────────────────
const SWIPE_THRESHOLD     = 72   // px left needed to commit a swipe
const BACK_RAW_THRESHOLD  = 80   // raw px right needed to go back
const VELOCITY_THRESH     = 0.45 // px/ms — fast flick counts even below threshold

// ── Types ──────────────────────────────────────────────────────────────────
interface NewsCarouselProps {
  articles: NewsArticle[]
  onArticleClick: (article: NewsArticle) => void
}

// ── Main carousel ──────────────────────────────────────────────────────────
export function NewsCarousel({ articles, onArticleClick }: NewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragX,        setDragX]        = useState(0)
  const [isExiting,    setIsExiting]    = useState(false)
  const [isResetting,  setIsResetting]  = useState(false)
  const [enterPhase,   setEnterPhase]   = useState<"init" | "animate" | null>(null)

  const startXRef     = useRef(0)
  const startTimeRef  = useRef(0)
  const rawDeltaXRef  = useRef(0)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const mountedRef    = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const total  = articles.length
  const isDone = currentIndex >= total

  // ── Advance to next card ──────────────────────────────────────────────
  const advance = useCallback(() => {
    if (!mountedRef.current) return
    triggerHaptic("light")
    setIsExiting(true)
    setTimeout(() => {
      if (!mountedRef.current) return
      setIsResetting(true)
      setCurrentIndex(i => i + 1)
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
      setTimeout(() => {
        if (mountedRef.current) setEnterPhase(null)
      }, 300)
    }))
  }, [])

  const reset = () => {
    setCurrentIndex(0)
    setDragX(0)
    setIsExiting(false)
    setEnterPhase(null)
  }

  // ── Touch handlers ────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExiting || enterPhase !== null) return
    startXRef.current     = e.touches[0].clientX
    startTimeRef.current  = Date.now()
    rawDeltaXRef.current  = 0
    isDraggingRef.current = true
    hasDraggedRef.current = false
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

    const raw      = rawDeltaXRef.current
    rawDeltaXRef.current = 0
    const elapsed  = Math.max(1, Date.now() - startTimeRef.current)
    const velocity = Math.abs(dragX) / elapsed

    if (raw > BACK_RAW_THRESHOLD && currentIndex > 0) {
      goBack(currentIndex)
    } else if (dragX < -SWIPE_THRESHOLD || (velocity > VELOCITY_THRESH && dragX < -24)) {
      advance()
    } else {
      setDragX(0) // spring back
    }
  }

  const handleCardClick = () => {
    if (hasDraggedRef.current || isDone) return
    onArticleClick(articles[currentIndex])
  }

  // ── Derived values ────────────────────────────────────────────────────
  // 0 → idle, 1 → fully at threshold
  const dragProgress  = isExiting ? 1 : Math.min(Math.max(0, -dragX) / SWIPE_THRESHOLD, 1)
  const isDragging    = dragX !== 0   // true while finger is on screen

  // Cards to render (top, middle, back)
  const card0 = articles[currentIndex]
  const card1 = articles[currentIndex + 1]
  const card2 = articles[currentIndex + 2]

  // Top card CSS transform
  const topTransform = isExiting
    ? "translateX(-115%) rotate(-16deg)"
    : enterPhase === "init"
    ? "translateX(-115%) rotate(-10deg)"   // returning card starts off-screen left
    : `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`  // dragX=0 when enterPhase="animate"
  const topTransition = isExiting
    ? "transform 0.26s ease-in"
    : enterPhase === "init"
    ? "none"
    : enterPhase === "animate"
    ? "transform 0.3s ease-out"
    : (isDragging || isResetting)
    ? "none"
    : "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)"

  // ── "All caught up" state ─────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">You're all caught up!</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You've swiped through all {total} articles.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
        >
          <RotateCcw className="h-4 w-4" />
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-2 pb-4 flex flex-col">

      {/* ── Progress bar + counter ── */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
          {currentIndex + 1}&nbsp;/&nbsp;{total}
        </span>
        <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Card stack ──
           Height = viewport − all surrounding chrome:
           header(56) + tabs(48) + label-row(48) + progress(32) + hint(28) + bottom-nav(56) + gutter(6) = 274px
      ── */}
      <div
        className="relative select-none"
        style={{ height: "calc(100dvh - 274px)", minHeight: "320px" }}
      >
        {/* Back card (card2) */}
        {card2 && (
          <div
            className="absolute inset-x-0 top-0 bottom-0 rounded-2xl overflow-hidden"
            style={{
              zIndex: 1,
              opacity: 0.72,
              transform: isExiting
                ? "scale(0.94) translateY(10px)"   // advance toward middle during forward exit
                : enterPhase === "init"
                ? "scale(0.94) translateY(10px)"   // start at middle (was card1 before back-swipe)
                : "scale(0.88) translateY(20px)",  // resting back position
              transition: (isExiting || enterPhase === "animate") ? "transform 0.3s ease-out" : "none",
            }}
          >
            <ArticleCard article={card2} />
          </div>
        )}

        {/* Middle card (card1) */}
        {card1 && (
          <div
            className="absolute inset-x-0 top-0 bottom-0 rounded-2xl overflow-hidden shadow-md"
            style={{
              zIndex: 2,
              transform: isExiting
                ? "scale(1) translateY(0)"         // advance to top during forward exit
                : enterPhase === "init"
                ? "scale(1) translateY(0)"         // start at top (was card0 before back-swipe)
                : "scale(0.94) translateY(10px)",  // resting middle position
              transition: (isExiting || enterPhase === "animate") ? "transform 0.3s ease-out" : "none",
            }}
          >
            <ArticleCard article={card1} />
          </div>
        )}

        {/* Top card (card0) — interactive */}
        <div
          className="absolute inset-x-0 top-0 bottom-0 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            zIndex: 3,
            transform: topTransform,
            transition: topTransition,
            cursor: "grab",
            touchAction: "pan-y",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardClick}
        >
          <ArticleCard article={card0} dragProgress={dragProgress} />
        </div>
      </div>

      {/* ── Swipe hint ── */}
      <p className="mt-3 text-center text-[11px] text-muted-foreground tracking-wide">
        Swipe left · right to navigate &nbsp;·&nbsp; Tap to read
      </p>
    </div>
  )
}

// ── Single article card ────────────────────────────────────────────────────
function ArticleCard({
  article,
  dragProgress = 0,
}: {
  article: NewsArticle
  dragProgress?: number
}) {
  return (
    <div className="h-full flex flex-col bg-card border border-border/30">

      {/* Image area — 44 % of card height */}
      <div className="relative overflow-hidden" style={{ flex: "0 0 44%" }}>
        <img
          src={article.imageUrl || (article.source.name.toLowerCase().includes("nse") ? "/default-nse.jpg" : "/default-news.svg")}
          alt={article.headline}
          className="w-full h-full object-cover"
          draggable={false}
          onError={(e) => {
            const isNse = article.source.name.toLowerCase().includes("nse")
            ;(e.target as HTMLImageElement).src = isNse ? "/default-nse.jpg" : "/default-news.svg"
          }}
        />

        {/* Bottom gradient so source pill is readable over any image */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Source pill */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/65 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold text-white">
            {article.source.name}
          </span>
        </div>

        {/* AI badge */}
        {article.aiSummaryAvailable && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary rounded-full px-2.5 py-[5px] shadow-lg">
            <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground">AI</span>
          </div>
        )}

        {/* Swipe overlay — fades in as user drags left */}
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
      <div className="flex flex-1 flex-col p-4 min-h-0">
        <p className="text-[11px] text-muted-foreground mb-2">{article.timestamp}</p>

        <h3 className="text-[17px] font-bold leading-snug text-foreground line-clamp-3 mb-2.5">
          {article.headline}
        </h3>

        {/* Summary teaser */}
        <div className="flex-1 min-h-0">
          {article.content ? (
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
              {article.content}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="text-xs">AI summary generating…</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {article.commentsCount > 0
                ? `${article.commentsCount} discussion${article.commentsCount !== 1 ? "s" : ""}`
                : "Be first to discuss"}
            </span>
          </div>
          <span className="text-xs font-semibold text-primary">Read more →</span>
        </div>
      </div>
    </div>
  )
}
