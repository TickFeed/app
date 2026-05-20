import { useEffect, useRef, useState } from "react"

const PULL_THRESHOLD = 110  // raw px the user must drag to trigger refresh
const MAX_VISUAL     = 48   // max px of the indicator bar height
const RESISTANCE     = 0.5  // pull feels heavier than 1:1

export type PullState = "idle" | "pulling" | "refreshing"

/**
 * Attach to a scrollable container. Returns pull state and a progress value
 * (0-1) so callers can render their own indicator.
 *
 * @param containerRef  ref to the scrollable element
 * @param onRefresh     async callback — called when the user releases past threshold
 */
export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const [pullState, setPullState] = useState<PullState>("idle")
  const [visualDistance, setVisualDistance] = useState(0)

  // Refs so event handlers always see current values without stale closures
  const startYRef       = useRef(0)
  const isPullingRef    = useRef(false)
  const isRefreshingRef = useRef(false)
  const rawDeltaRef     = useRef(0)
  const onRefreshRef    = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY
        isPullingRef.current = true
        rawDeltaRef.current = 0
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta > 0 && el.scrollTop === 0) {
        e.preventDefault()
        rawDeltaRef.current = delta
        const visual = Math.min(delta * RESISTANCE, MAX_VISUAL)
        setVisualDistance(visual)
        setPullState("pulling")
      } else {
        isPullingRef.current = false
        rawDeltaRef.current = 0
        setVisualDistance(0)
        setPullState("idle")
      }
    }

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return
      isPullingRef.current = false
      const raw = rawDeltaRef.current
      rawDeltaRef.current = 0
      setVisualDistance(0)

      if (raw >= PULL_THRESHOLD) {
        isRefreshingRef.current = true
        setPullState("refreshing")
        try {
          await onRefreshRef.current()
        } finally {
          isRefreshingRef.current = false
          setPullState("idle")
        }
      } else {
        setPullState("idle")
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove",  onTouchMove,  { passive: false })
    el.addEventListener("touchend",   onTouchEnd)

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove",  onTouchMove)
      el.removeEventListener("touchend",   onTouchEnd)
    }
  }, [containerRef])

  /** 0 → 1 progress toward trigger threshold */
  const progress = Math.min(visualDistance / (PULL_THRESHOLD * RESISTANCE), 1)

  return { pullState, visualDistance, progress }
}
