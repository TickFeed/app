"use client"

import { useEffect, useState } from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { isNative } from "@/lib/native"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      console.warn("[crash-guard] Unhandled rejection:", event.reason)
    }
    window.addEventListener("unhandledrejection", handler)
    return () => window.removeEventListener("unhandledrejection", handler)
  }, [])

  // Before mount (SSR + first paint): render children only — no GSI script.
  // On native (Capacitor/Android): skip GoogleOAuthProvider so its GSI script
  // (accounts.google.com/gsi/client) is never loaded — Google blocks that
  // script in WebViews and redirects to Chrome.
  if (!mounted || isNative()) {
    return <>{children}</>
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      {children}
    </GoogleOAuthProvider>
  )
}
