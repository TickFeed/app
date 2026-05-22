"use client"

import { useEffect, useRef } from "react"
import { isNative } from "./native"
import { registerFcmToken } from "./api"

export interface PushNotificationData {
  target_type?: string
  target_id?: string
  target_tab?: string
  [key: string]: string | undefined
}

/**
 * Registers the device with FCM and listens for notification taps.
 * Only runs on native (Capacitor) — web uses usePushNotifications in push.ts.
 */
export function useNativePush(
  token: string | null,
  onTap: (data: PushNotificationData) => void,
) {
  const registeredRef = useRef(false)
  const onTapRef = useRef(onTap)

  // Keep the callback ref fresh without re-running setup
  useEffect(() => { onTapRef.current = onTap }, [onTap])

  useEffect(() => {
    if (!token || registeredRef.current || !isNative()) return

    let PushNotificationsModule: typeof import("@capacitor/push-notifications")["PushNotifications"] | null = null

    async function setup() {
      try {
        const mod = await import("@capacitor/push-notifications")
        PushNotificationsModule = mod.PushNotifications

        const permission = await PushNotificationsModule.requestPermissions()
        if (permission.receive !== "granted") return

        await PushNotificationsModule.register()

        await PushNotificationsModule.addListener("registration", ({ value: fcmToken }) => {
          registerFcmToken(token!, fcmToken)
            .then(() => { registeredRef.current = true })
            .catch((err) => { console.warn("[native-push] FCM token registration failed:", err) })
        })

        await PushNotificationsModule.addListener("registrationError", (err) => {
          console.warn("[native-push] registration error:", err)
        })

        // Foreground notification received — Capacitor shows it automatically
        // No action needed unless you want custom in-app banners

        await PushNotificationsModule.addListener("pushNotificationActionPerformed", ({ notification }) => {
          try {
            onTapRef.current((notification.data ?? {}) as PushNotificationData)
          } catch (err) {
            console.warn("[native-push] notification tap handler failed:", err)
          }
        })
      } catch (err) {
        console.warn("[native-push] setup failed:", err)
      }
    }

    setup()

    return () => {
      PushNotificationsModule?.removeAllListeners().catch(() => {})
      registeredRef.current = false
    }
  }, [token])
}
