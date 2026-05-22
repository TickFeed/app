"use client"

import { useEffect } from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"

export function Providers({ children }: { children: React.ReactNode }) {
  // Prevent unhandled Promise rejections from crashing the Android WebView.
  // Any rejection that escapes a try/catch (e.g. during a backend outage) is
  // logged and suppressed instead of being treated as a fatal error.
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      console.warn("[crash-guard] Unhandled rejection:", event.reason)
    }
    window.addEventListener("unhandledrejection", handler)
    return () => window.removeEventListener("unhandledrejection", handler)
  }, [])

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      {children}
    </GoogleOAuthProvider>
  )
}
