"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, Bell, AtSign, Newspaper, Check } from "lucide-react"
import {
  getNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  formatRelativeTime,
  type AppNotification,
} from "@/lib/api"

interface NotificationsScreenProps {
  token: string
  onBack: () => void
  onNavigateToArticle: (newsId: number, tab?: string) => void
  onNavigateToStock: (symbol: string, tab?: string) => void
  onNavigateToCommunityPost: (postId: number) => void
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "mention") {
    return (
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <AtSign className="h-5 w-5 text-primary" />
      </div>
    )
  }
  return (
    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
      <Newspaper className="h-5 w-5 text-emerald-500" />
    </div>
  )
}

export function NotificationsScreen({
  token,
  onBack,
  onNavigateToArticle,
  onNavigateToStock,
  onNavigateToCommunityPost,
}: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(() => {
    setLoading(true)
    getNotifications(token)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleTap = async (n: AppNotification) => {
    // Mark as read immediately
    if (!n.read) {
      markNotificationsRead(token, [n.id]).catch(() => {})
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }

    // Navigate to target
    if (n.target_type === "community" && n.source_post_id) {
      // Post/mention in community → open that post's comments
      onNavigateToCommunityPost(n.source_post_id)
    } else if (n.target_type === "article" && n.target_id) {
      // Article mention → land on discussions tab; stock news → ai-summary
      const tab = n.type === "mention" ? "discussions" : (n.target_tab ?? "ai-summary")
      onNavigateToArticle(parseInt(n.target_id, 10), tab)
    } else if (n.target_type === "stock" && n.target_id) {
      onNavigateToStock(n.target_id, n.target_tab ?? "overview")
    }
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(token).catch(() => {})
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-10 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-1 text-primary">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <span className="font-semibold text-foreground">Notifications</span>
        {unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-primary"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : (
          <div className="w-20" />
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <svg className="h-7 w-7 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              You'll be notified when someone mentions you or when there's news about your stocks.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleTap(n)}
                  className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
