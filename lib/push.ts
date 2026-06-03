"use client"

import { useEffect, useRef } from "react"
import { getVapidPublicKey, subscribePush } from "./api"
import { isNative } from "./native"

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(b64)
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)))
}

/**
 * Registers the service worker and subscribes the device to Web Push.
 * Runs once after login; re-runs if token changes. Safe to call on every render.
 */
export function usePushNotifications(token: string | null) {
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!token || subscribedRef.current) return
    if (typeof window === "undefined") return
    if (isNative()) return // native uses FCM via push-native.ts instead
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    const alreadyDenied = localStorage.getItem("push-permission") === "denied"
    if (alreadyDenied) return

    async function setup() {
      try {
        const permission = await Notification.requestPermission()
        localStorage.setItem("push-permission", permission)
        if (permission !== "granted") return

        const reg = await navigator.serviceWorker.ready
        const vapidKey = await getVapidPublicKey()

        // Re-use existing subscription if present
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          })
        }

        const json = sub.toJSON()
        const keys = json.keys as { auth: string; p256dh: string }
        await subscribePush(token!, { endpoint: sub.endpoint, auth: keys.auth, p256dh: keys.p256dh })
        subscribedRef.current = true
      } catch (err) {
        // Non-fatal — app works fine without push
        console.warn("[push] setup failed:", err)
      }
    }

    setup()
  }, [token])
}
