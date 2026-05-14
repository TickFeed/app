"use client"

interface MarketDigestProps {
  headline: string
  subtext: string
  date: string
  chartData?: number[]
}

export function MarketDigest({ headline, subtext, date, chartData }: MarketDigestProps) {
  // Generate chart path
  const data = chartData || [40, 45, 42, 48, 55, 52, 58, 62, 60, 65, 70, 68, 72, 78, 80]
  const width = 260
  const height = 80
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height * 0.8 - 8
    return `${x},${y}`
  }).join(" ")

  // Create gradient area
  const areaPath = `M0,${height} L${points.split(" ").map(p => p).join(" L")} L${width},${height} Z`

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800/90 to-zinc-900/95 p-4">
      {/* Background gradient accent */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            MARKET DIGEST
          </span>
          <p className="text-xs text-zinc-500">{date}</p>
        </div>

        {/* Content with chart */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 pt-2">
            <h3 className="text-xl font-bold leading-tight text-white">
              {headline}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {subtext}
            </p>
          </div>

          {/* Chart */}
          <div className="flex-shrink-0">
            <svg width={width * 0.5} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-80">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--gain)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chartGradient)" />
              <polyline
                points={points}
                fill="none"
                stroke="var(--gain)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
