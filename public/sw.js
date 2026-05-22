self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* ignore */ }
  const { title = "TickFeed", body = "", url = "/", icon = "/icon.svg" } = data
  event.waitUntil(
    self.registration.showNotification(title, { body, icon, data: { url } })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
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
