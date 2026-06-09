"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Bell, Newspaper, TrendingUp, X } from "lucide-react"
import { addToWatchlist, symbolToColor, symbolToLogo } from "@/lib/api"

const POPULAR_STOCKS = [
  { symbol: "RELIANCE",   name: "Reliance" },
  { symbol: "HDFCBANK",   name: "HDFC Bank" },
  { symbol: "ICICIBANK",  name: "ICICI Bank" },
  { symbol: "INFY",       name: "Infosys" },
  { symbol: "TCS",        name: "TCS" },
  { symbol: "SBIN",       name: "SBI" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance" },
  { symbol: "BHARTIARTL", name: "Airtel" },
  { symbol: "AXISBANK",   name: "Axis Bank" },
  { symbol: "TITAN",      name: "Titan" },
  { symbol: "WIPRO",      name: "Wipro" },
  { symbol: "MARUTI",     name: "Maruti" },
  { symbol: "SUNPHARMA",  name: "Sun Pharma" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "ITC",        name: "ITC" },
  { symbol: "KOTAKBANK",  name: "Kotak Bank" },
  { symbol: "LT",         name: "L&T" },
  { symbol: "NESTLEIND",  name: "Nestle" },
  { symbol: "HCLTECH",    name: "HCL Tech" },
  { symbol: "M&M",        name: "M&M" },
]

interface OnboardingWatchlistSheetProps {
  token: string
  onDone: (added: boolean) => void
}

export function OnboardingWatchlistSheet({ token, onDone }: OnboardingWatchlistSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggle = (symbol: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(symbol) ? next.delete(symbol) : next.add(symbol)
      return next
    })
  }

  const handleDone = async () => {
    if (saving) return
    setSaving(true)
    const added = selected.size > 0
    try {
      if (added) {
        await Promise.allSettled([...selected].map(sym => addToWatchlist(token, sym)))
      }
    } finally {
      setSaving(false)
      onDone(added)
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={handleDone} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)", maxHeight: "90dvh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Personalise your feed</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pick stocks to follow — takes 10 seconds</p>
          </div>
          <button
            onClick={handleDone}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors -mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Value props */}
        <div className="flex gap-3 px-5 pb-4 shrink-0">
          <div className="flex-1 flex items-start gap-2.5 rounded-xl bg-primary/8 border border-primary/15 px-3 py-2.5">
            <Newspaper className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">My Stocks tab</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">News filtered to only your stocks</p>
            </div>
          </div>
          <div className="flex-1 flex items-start gap-2.5 rounded-xl bg-primary/8 border border-primary/15 px-3 py-2.5">
            <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Daily alerts</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Market open & close updates</p>
            </div>
          </div>
        </div>

        {/* Stock grid — scrollable */}
        <div className="px-5 pb-2 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Popular Nifty 50 stocks
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {POPULAR_STOCKS.map(({ symbol, name }) => {
              const isSelected = selected.has(symbol)
              return (
                <button
                  key={symbol}
                  onClick={() => toggle(symbol)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 border transition-all active:scale-95 ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                      : "border-border bg-muted/40 hover:border-primary/40"
                  }`}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: symbolToColor(symbol) }}
                  >
                    {symbolToLogo(symbol)}
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight text-center ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {name}
                  </span>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <button
            onClick={handleDone}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : selected.size > 0
              ? `Add ${selected.size} stock${selected.size > 1 ? "s" : ""} & get started`
              : "Skip for now"}
          </button>
          {selected.size === 0 && (
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              You can always add stocks from the Watchlist tab
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
