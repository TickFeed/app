/**
 * SSE hook for live price updates.
 *
 * Connects to /api/prices/stream with the given symbols and token.
 * Calls onSnapshot with the full initial data set, then onPrice for each
 * individual price change event. Reconnects automatically on error.
 *
 * Only opens a connection when symbols.length > 0 and enabled is true.
 */
"use client"

import { useEffect, useRef } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const RECONNECT_DELAY_MS = 5_000

export interface PriceQuote {
  symbol: string
  price: number
  change: number
  change_pct: number
  is_positive: boolean
}

interface UsePriceStreamOptions {
  symbols: string[]
  token: string
  onSnapshot: (quotes: PriceQuote[]) => void
  onPrice: (quote: PriceQuote) => void
  enabled?: boolean
}

export function usePriceStream({
  symbols,
  token,
  onSnapshot,
  onPrice,
  enabled = true,
}: UsePriceStreamOptions): void {
  const esRef       = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSnapshotRef = useRef(onSnapshot)
  const onPriceRef    = useRef(onPrice)

  onSnapshotRef.current = onSnapshot
  onPriceRef.current    = onPrice

  useEffect(() => {
    if (!enabled || symbols.length === 0) return

    let cancelled = false

    function connect() {
      if (cancelled) return

      const url =
        `${API_BASE}/api/prices/stream` +
        `?token=${encodeURIComponent(token)}` +
        `&symbols=${symbols.map(encodeURIComponent).join(",")}`

      const es = new EventSource(url)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.type === "snapshot") {
            onSnapshotRef.current(msg.data as PriceQuote[])
          } else if (msg.type === "price") {
            onPriceRef.current(msg as PriceQuote)
          }
          // "keepalive" comment lines don't trigger onmessage, so nothing to handle
        } catch {
          // ignore malformed frames
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (!cancelled) {
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      esRef.current?.close()
      esRef.current = null
    }
  // Reconnect only when symbols list or token changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), token, enabled])
}
