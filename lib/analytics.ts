import { Capacitor } from "@capacitor/core"

type EventParams = Record<string, string | number | boolean>

async function getFirebaseAnalytics() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import("@capacitor-firebase/analytics")
    // Wrap in object to prevent JS treating the Capacitor plugin as a thenable
    return { fa: mod.FirebaseAnalytics }
  } catch {
    return null
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  const res = await getFirebaseAnalytics()
  if (!res) return
  try {
    await res.fa.setCurrentScreen({ screenName })
  } catch { /* non-fatal */ }
}

export async function logEvent(name: string, params?: EventParams): Promise<void> {
  const res = await getFirebaseAnalytics()
  if (!res) return
  try {
    await res.fa.logEvent({ name, params })
  } catch { /* non-fatal */ }
}

export async function setAnalyticsUser(userId: string): Promise<void> {
  const res = await getFirebaseAnalytics()
  if (!res) return
  try {
    await res.fa.setUserId({ userId })
  } catch { /* non-fatal */ }
}

export async function clearAnalyticsUser(): Promise<void> {
  const res = await getFirebaseAnalytics()
  if (!res) return
  try {
    await res.fa.setUserId({ userId: null })
  } catch { /* non-fatal */ }
}
