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

    async function setup() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications")

        const permission = await PushNotifications.requestPermissions()
        if (permission.receive !== "granted") return

        await PushNotifications.register()

        await PushNotifications.addListener("registration", async ({ value: fcmToken }) => {
          try {
            await registerFcmToken(token!, fcmToken)
            registeredRef.current = true
          } catch (err) {
            console.warn("[native-push] FCM token registration failed:", err)
          }
        })

        await PushNotifications.addListener("registrationError", (err) => {
          console.warn("[native-push] registration error:", err)
        })

        // Foreground notification received — Capacitor shows it automatically
        // No action needed unless you want custom in-app banners

        await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          onTapRef.current(notification.data as PushNotificationData)
        })
      } catch (err) {
        console.warn("[native-push] setup failed:", err)
      }
    }

    setup()
  }, [token])
}
