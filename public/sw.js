self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* ignore */ }
  const {
    title = "TickFeed",
    body = "",
    url = "/",
    icon = "/icon.svg",
    image,
    tag,
  } = data

  const options = {
    body,
    icon,
    badge: "/icon.svg",
    image: image || undefined,
    tag: tag || "tickfeed-default",
    renotify: true,
    vibrate: [100, 50, 100],
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { url },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "dismiss") return

  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.postMessage({ type: "notification_click", url })
          return client.focus()
        }
      }
      return clients.openWindow(url)
    }).catch(() => {})
  )
})
