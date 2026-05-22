import { Capacitor } from "@capacitor/core"

export function isNative(): boolean {
  if (typeof window === "undefined") return false
  return Capacitor.isNativePlatform()
}

export async function updateStatusBar(theme: "light" | "dark"): Promise<void> {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar")
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: theme === "dark" ? "#09090b" : "#ffffff" })
  } catch { /* non-fatal */ }
}

export async function triggerHaptic(style: "light" | "medium" = "light"): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
    await Haptics.impact({ style: style === "light" ? ImpactStyle.Light : ImpactStyle.Medium })
  } catch { /* non-fatal */ }
}

export async function openBrowser(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, "_blank")
    return
  }
  try {
    const { Browser } = await import("@capacitor/browser")
    await Browser.open({ url, presentationStyle: "popover" })
  } catch {
    window.open(url, "_blank")
  }
}
