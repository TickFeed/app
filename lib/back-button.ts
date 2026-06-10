"use client"

import { useEffect, useRef } from "react"
import { isNative } from "./native"

/**
 * Intercepts the Android hardware/gesture back button.
 * onBack() should return true if it handled navigation (stay in app),
 * or false to let the app exit.
 */
export function useAndroidBackButton(onBack: () => boolean) {
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack }, [onBack])

  useEffect(() => {
    if (!isNative()) return

    let removeListener: (() => void) | undefined

    async function setup() {
      try {
        const { App } = await import("@capacitor/app")
        const handle = await App.addListener("backButton", () => {
          let handled = false
          try {
            handled = onBackRef.current()
          } catch (err) {
            console.warn("[back-button] handler threw:", err)
            handled = true // don't exit the app on handler errors
          }
          if (!handled) App.exitApp()
        })
        removeListener = () => handle.remove()
      } catch (err) {
        console.warn("[back-button] setup failed:", err)
      }
    }

    setup()
    return () => removeListener?.()
  }, [])
}
