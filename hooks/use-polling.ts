import { useEffect, useRef } from "react"

/**
 * Calls `callback` repeatedly on a fixed interval while the component is mounted.
 * The callback is NOT called immediately — use a separate useEffect for the initial fetch.
 *
 * @param callback  Function to call on each tick. Stable via ref — no need to memoize.
 * @param intervalMs  Milliseconds between ticks.
 * @param enabled  Set to false to pause polling (e.g. when the tab is not visible).
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
): void {
  const ref = useRef(callback)
  ref.current = callback

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => ref.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
