import { Capacitor } from "@capacitor/core"

type EventParams = Record<string, string | number | boolean>

async function getFirebaseAnalytics() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics")
    return FirebaseAnalytics
  } catch {
    return null
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  const fa = await getFirebaseAnalytics()
  if (!fa) return
  try {
    await fa.setCurrentScreen({ screenName })
  } catch { /* non-fatal */ }
}

export async function logEvent(name: string, params?: EventParams): Promise<void> {
  const fa = await getFirebaseAnalytics()
  if (!fa) return
  try {
    await fa.logEvent({ name, params })
  } catch { /* non-fatal */ }
}

export async function setAnalyticsUser(userId: string): Promise<void> {
  const fa = await getFirebaseAnalytics()
  if (!fa) return
  try {
    await fa.setUserId({ userId })
  } catch { /* non-fatal */ }
}

export async function clearAnalyticsUser(): Promise<void> {
  const fa = await getFirebaseAnalytics()
  if (!fa) return
  try {
    await fa.setUserId({ userId: null })
  } catch { /* non-fatal */ }
}
