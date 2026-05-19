"use client"

import { useRef, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface IndexDigest {
  headline: string
  brief: string
}

interface MarketDigestProps {
  headline?: string | null
  brief?: string | null
  dateLabel?: string | null
  indexDigests?: { nifty50?: IndexDigest; sensex?: IndexDigest; banknifty?: IndexDigest }
}

const INDEX_LABELS = ["Nifty 50", "Sensex", "Bank Nifty"]
const INDEX_KEYS = ["nifty50", "sensex", "banknifty"] as const

function detectTrend(text: string | null | undefined): boolean | null {
  if (!text) return null
  const lower = text.toLowerCase()
  const pos = ["gain", "surge", "rise", "advance", "climb", "rally", "positive", "higher", "green", "bull", "recover"]
  const neg = ["fall", "drop", "decline", "loss", "slip", "bear", "negative", "lower", "red", "weak", "sell", "pressure"]
  const p = pos.filter(w => lower.includes(w)).length
  const n = neg.filter(w => lower.includes(w)).length
  if (p === 0 && n === 0) return null
  return p >= n
}

function SentimentSparkline({ trend }: { trend: boolean | null }) {
  const W = 80, H = 40, pad = 4
  const rawPoints = trend === true
    ? [0.25, 0.35, 0.28, 0.50, 0.42, 0.68, 0.60, 0.88]
    : trend === false
    ? [0.88, 0.72, 0.80, 0.58, 0.50, 0.32, 0.40, 0.15]
    : [0.45, 0.52, 0.44, 0.56, 0.48, 0.58, 0.50, 0.54]

  const stroke = trend === true ? "#22c55e" : trend === false ? "#ef4444" : "#94a3b8"
  const fill   = trend === true ? "rgba(34,197,94,0.12)" : trend === false ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.08)"

  const coords = rawPoints.map((v, i) => {
    const x = pad + (i / (rawPoints.length - 1)) * (W - pad * 2)
    const y = H - pad - v * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

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

export function MarketDigest({ headline, brief, dateLabel, indexDigests }: MarketDigestProps) {
  const [active, setActive] = useState(0)
  const touchStartX = useRef(0)

  // Always render all 3 index cards (hidden ones keep the card height stable)
  const displayCards = INDEX_KEYS.map((key, i) => {
    const digest = indexDigests?.[key]
    return {
      label: INDEX_LABELS[i],
      headline: digest?.headline ?? (i === 0 ? headline : null),
      brief: digest?.brief ?? (i === 0 ? brief : null),
    }
  })

  // Only render if at least one card has content
  const hasAnyContent = displayCards.some(c => c.headline || c.brief)
  if (!hasAnyContent) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 40 && active < displayCards.length - 1) setActive(a => a + 1)
    if (diff < -40 && active > 0) setActive(a => a - 1)
  }

  return (
    <div
      className="w-full rounded-2xl bg-card border border-border px-4 py-4 select-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Market Digest
          </span>
          {dateLabel && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{dateLabel}</p>
          )}
        </div>
        {displayCards.length > 1 && (
          <div className="flex items-center gap-1 mt-0.5">
            {displayCards.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cards — all occupy the same grid cell; inactive are hidden to prevent layout shift */}
      <div className="grid">
        {displayCards.map((card, idx) => {
          const trend = detectTrend(card.headline) ?? detectTrend(card.brief)
          return (
            <div
              key={card.label}
              className="col-start-1 row-start-1 flex items-start gap-3"
              style={{ visibility: idx === active ? "visible" : "hidden" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">{card.label}</span>
                  {trend === true  && <TrendingUp   className="h-3 w-3 text-green-500" />}
                  {trend === false && <TrendingDown  className="h-3 w-3 text-red-500" />}
                </div>
                {card.headline ? (
                  <p className="text-[17px] font-bold leading-snug text-foreground">{card.headline}</p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-3/5 rounded bg-muted animate-pulse" />
                  </div>
                )}
                {card.brief && (
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{card.brief}</p>
                )}
              </div>
              <div className="shrink-0 mt-0.5">
                <SentimentSparkline trend={trend} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
