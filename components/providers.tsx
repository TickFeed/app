"use client"

import { useEffect } from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { isNative } from "@/lib/native"

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

  // On native (Capacitor/Android), Google Sign-In is handled by
  // @codetrix-studio/capacitor-google-auth. Skip GoogleOAuthProvider so its
  // GSI script (accounts.google.com/gsi/client) is never loaded — Google
  // blocks that script in WebViews and redirects to Chrome.
  if (isNative()) {
    return <>{children}</>
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      {children}
    </GoogleOAuthProvider>
  )
}
