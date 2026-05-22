"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <p className="text-lg font-semibold text-foreground">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        A connection problem may have occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
