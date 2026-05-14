"use client"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: "gain" | "loss"
  strokeWidth?: number
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 32, 
  color = "gain",
  strokeWidth = 1.5 
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(" ")

  const strokeColor = color === "gain" ? "var(--gain)" : "var(--loss)"

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-animate"
      />
    </svg>
  )
}
