"use client"

import { useRef, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface TickerItem {
  symbol: string
  value: string
  change: string
  isPositive: boolean
  price?: number
  prevClose?: number
  dayOpen?: number
  dayHigh?: number
  dayLow?: number
}

interface IndexDigest {
  headline: string
  brief: string
}

interface MarketDigestProps {
  items: TickerItem[]
  headline?: string | null
  brief?: string | null
  dateLabel?: string | null
  indexDigests?: { nifty50?: IndexDigest; sensex?: IndexDigest; banknifty?: IndexDigest }
  onCardClick?: () => void
}

const INDEX_ORDER = ["NIFTY 50", "SENSEX", "NIFTY BANK"]
const INDEX_LABEL: Record<string, string> = {
  "NIFTY 50":   "Nifty 50",
  "SENSEX":     "Sensex",
  "NIFTY BANK": "Bank Nifty",
}

function computedBrief(item: TickerItem): string {
  const name      = INDEX_LABEL[item.symbol] ?? item.symbol
  const dir       = item.isPositive ? "gained" : "lost"
  const pts       = item.price != null && item.prevClose != null
    ? Math.abs(item.price - item.prevClose).toFixed(0)
    : null
  const pctAbs    = item.change.replace("-", "").replace("+", "")
  if (pts) return `${name} ${dir} ${pts} pts (${pctAbs}) from previous close.`
  return `${name} ${dir} ${pctAbs} from previous close.`
}

function Sparkline({ item }: { item: TickerItem }) {
  const price     = item.price     ?? 0
  const prevClose = item.prevClose ?? price
  const open      = item.dayOpen   ?? prevClose
  const high      = item.dayHigh   ?? Math.max(price, open)
  const low       = item.dayLow    ?? Math.min(price, open)

  const isUp   = price >= prevClose
  const points = isUp
    ? [prevClose, open, low, high, price]
    : [prevClose, open, high, low, price]

  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1

  const W = 96, H = 44, pad = 4

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const stroke   = isUp ? "#22c55e" : "#ef4444"
  const fill     = isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"
  const polyline = coords.join(" ")
  const firstX   = coords[0].split(",")[0]
  const lastX    = coords[coords.length - 1].split(",")[0]

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline
        points={polyline}
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <polygon
        points={`${firstX},${H} ${polyline} ${lastX},${H}`}
        fill={fill}
      />
    </svg>
  )
}

const INDEX_KEY = ["nifty50", "sensex", "banknifty"] as const

export function MarketDigest({ items, headline, brief, dateLabel, indexDigests, onCardClick }: MarketDigestProps) {
  const [active, setActive] = useState(0)
  const touchStartX = useRef(0)

  if (items.length === 0) return null

  const indices = INDEX_ORDER
    .map(sym => items.find(i => i.symbol === sym))
    .filter(Boolean) as TickerItem[]

  if (indices.length === 0) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 40 && active < indices.length - 1) setActive(a => a + 1)
    if (diff < -40 && active > 0) setActive(a => a - 1)
  }

  return (
    <div className="space-y-3">
      {/* ── Single digest card ─────────────────────────── */}
      <div
        className="w-full rounded-2xl bg-card border border-border px-4 py-4 select-none"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fixed header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Market Digest
            </span>
            {dateLabel && (
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{dateLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {indices.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/*
          All 3 content blocks sit in the same grid cell.
          Inactive ones are visibility:hidden (still occupy space) so the
          card always sizes to the tallest card — no layout shift, no clipping.
        */}
        <div className="grid">
          {indices.map((item, idx) => {
            const key      = INDEX_KEY[idx]
            const aiCard   = indexDigests?.[key]
            const h = aiCard?.headline ?? (idx === 0 ? headline : INDEX_LABEL[item.symbol]) ?? null
            const b = aiCard?.brief    ?? (idx === 0 ? brief    : computedBrief(item))     ?? null
            return (
              <div
                key={item.symbol}
                className="col-start-1 row-start-1 flex items-start gap-3"
                style={{ visibility: idx === active ? "visible" : "hidden" }}
              >
                <div className="flex-1 min-w-0">
                  {h ? (
                    <p className="text-[17px] font-bold leading-snug text-foreground">{h}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-muted animate-pulse" />
                      <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-3/5 rounded bg-muted animate-pulse" />
                    </div>
                  )}
                  {b && (
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{b}</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  <Sparkline item={item} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Ticker tray — evenly spread ────────────────── */}
      <div className="flex">
        {indices.map((item) => (
          <div key={item.symbol} className="flex-1 text-center">
            <p className="text-[11px] text-muted-foreground">{INDEX_LABEL[item.symbol] ?? item.symbol}</p>
            <p className="text-sm font-bold text-foreground leading-tight">{item.value}</p>
            <div className={`flex items-center justify-center gap-0.5 text-[11px] font-medium ${item.isPositive ? "text-green-500" : "text-red-500"}`}>
              {item.isPositive
                ? <TrendingUp className="h-2.5 w-2.5" />
                : <TrendingDown className="h-2.5 w-2.5" />}
              {item.isPositive ? "+" : ""}{item.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
