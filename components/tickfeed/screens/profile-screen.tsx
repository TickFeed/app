"use client"

import { ChevronRight, Clock, HelpCircle, LogOut, Moon, Sun, Newspaper, TrendingUp, Users, Zap, X, Heart, MessageCircle, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AuthUser, AvatarStyle } from "@/lib/auth"
import {
  getUserStats, getInteractionHistory, getFollowing, getMyProfile, getUserPublicProfile,
  followUser, unfollowUser, getUserPosts,
  formatRelativeTime, sourceToIcon, symbolToColor, symbolToLogo, dicebearUrl as apiBearUrl,
  type UserStats, type InteractionHistoryItem,
  type FollowingUser, type PublicUserProfile, type CommunityPost,
} from "@/lib/api"
import type { NewsArticle } from "@/app/page"
import { HelpSupportScreen } from "./help-support-screen"

// ── Alpha Score ───────────────────────────────────────────────────────────────
function calcAlphaScore(posts: number, likes: number, followers: number) {
  return posts * 15 + likes * 8 + followers * 25
}

const ALPHA_TIERS = [
  { min: 3000, label: "Market Maven",  color: "text-amber-500",        barBg: "bg-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",  desc: "Elite market authority"      },
  { min: 1500, label: "Shark",         color: "text-purple-500",       barBg: "bg-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/30", desc: "Aggressive market hunter"    },
  { min: 700,  label: "Strategist",    color: "text-blue-500",         barBg: "bg-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30",   desc: "Sharp analytical thinker"    },
  { min: 300,  label: "Bull",          color: "text-emerald-500",      barBg: "bg-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30",desc: "Consistently bullish voice"   },
  { min: 100,  label: "Analyst",       color: "text-primary",          barBg: "bg-primary",     bg: "bg-primary/10",     border: "border-primary/30",    desc: "Building market credibility"  },
  { min: 1,    label: "Observer",      color: "text-foreground",       barBg: "bg-foreground",  bg: "bg-muted",          border: "border-border",        desc: "Starting the journey"         },
  { min: 0,    label: "Lurker",        color: "text-muted-foreground", barBg: "bg-muted-foreground", bg: "bg-muted",     border: "border-border",        desc: "Just getting started"         },
]

function alphaTier(score: number) {
  return ALPHA_TIERS.find((t) => score >= t.min) ?? ALPHA_TIERS[ALPHA_TIERS.length - 1]
}

function alphaNextTier(score: number) {
  const idx = ALPHA_TIERS.findIndex((t) => score >= t.min)
  return idx > 0 ? ALPHA_TIERS[idx - 1] : null
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_STYLES: { id: AvatarStyle; label: string }[] = [
  { id: "initials",           label: "Monogram"  },
  { id: "micah",              label: "Minimal"   },
  { id: "personas",           label: "Persona"   },
  { id: "notionists-neutral", label: "Classic"   },
  { id: "lorelei-neutral",    label: "Outline"   },
  { id: "shapes",             label: "Shape"     },
]

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=80`
}

const editSchema = z.object({
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
})
type EditFormValues = z.infer<typeof editSchema>

const MENU_ITEMS = [
  { icon: Clock,       label: "Interaction History",  description: "Articles and stocks you've explored", hasArrow: true, action: "history" as const },
  { icon: HelpCircle,  label: "Help & Support",       description: "Raise an issue or send feedback",    hasArrow: true, action: "support" as const },
]


interface ProfileScreenProps {
  user: AuthUser
  token: string
  onSignOut: () => void
  onGoToWatchlist: () => void
  onArticleClick: (article: NewsArticle) => void
  onStockClick: (symbol: string) => void
  onUpdateUser: (fields: { firstName?: string; lastName?: string; username?: string; theme?: 'light' | 'dark'; avatarStyle?: AvatarStyle }) => Promise<{ user: AuthUser } | { error: string; field?: "username" }>
  initialUserId?: number
  initialUser?: PublicUserProfile | null
}

export function ProfileScreen({ user, token, onSignOut, onGoToWatchlist, onArticleClick, onStockClick, onUpdateUser, initialUserId, initialUser }: ProfileScreenProps) {
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : user.theme === "dark"
  )
  const [editOpen, setEditOpen] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyTab, setHistoryTab] = useState<"articles" | "stocks">("articles")
  const [history, setHistory] = useState<InteractionHistoryItem[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(user.avatarStyle ?? "initials")
  const [stats, setStats] = useState<UserStats | null>(null)
  const [following, setFollowing] = useState<FollowingUser[] | null>(null)
  const [myProfile, setMyProfile] = useState<PublicUserProfile | null>(null)
  const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(initialUser ?? null)
  const [userProfileLoading, setUserProfileLoading] = useState(!!initialUserId && !initialUser)
  const [showRankings, setShowRankings] = useState(false)
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([])
  const [userPostsLoading, setUserPostsLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    getUserStats(token).then(setStats).catch(() => {})
getFollowing(token).then(setFollowing).catch(() => setFollowing([]))
    getMyProfile(token).then(setMyProfile).catch(() => {})
  }, [token])

  const handleUserClick = useCallback(async (userId: number) => {
    setUserProfileLoading(true)
    try {
      const profile = await getUserPublicProfile(token, userId)
      setSelectedUser(profile)
    } catch { /* ignore */ }
    finally { setUserProfileLoading(false) }
  }, [token])

  const handleFollowToggle = useCallback(async (profile: PublicUserProfile) => {
    const wasFollowing = profile.is_following
    setSelectedUser((p) => p ? { ...p, is_following: !p.is_following, followers_count: p.followers_count + (wasFollowing ? -1 : 1) } : p)
    try {
      if (wasFollowing) await unfollowUser(token, profile.id)
      else await followUser(token, profile.id)
      // refresh following list
      getFollowing(token).then(setFollowing).catch(() => {})
    } catch {
      setSelectedUser((p) => p ? { ...p, is_following: wasFollowing, followers_count: profile.followers_count } : p)
    }
  }, [token])

  useEffect(() => {
    if (!selectedUser) { setUserPosts([]); return }
    setUserPostsLoading(true)
    getUserPosts(token, selectedUser.id)
      .then(setUserPosts)
      .catch(() => setUserPosts([]))
      .finally(() => setUserPostsLoading(false))
  }, [selectedUser?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialUser) {
      setSelectedUser(initialUser)
      setUserProfileLoading(false)
    }
  }, [initialUser])

  const handleOpenHistory = async () => {
    setHistoryOpen(true)
    if (history !== null) return // already loaded
    setHistoryLoading(true)
    try {
      const items = await getInteractionHistory(token)
      setHistory(items)
    } catch {
      setHistory([])
      toast({ title: "Could not load history", description: "Please try again." })
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleHistoryItemClick = (item: InteractionHistoryItem) => {
    setHistoryOpen(false)
    if (item.type === "stock") {
      onStockClick(item.symbol)
    } else {
      const article: NewsArticle = {
        id: String(item.id),
        url: undefined,
        source: { name: item.source, icon: sourceToIcon(item.source) },
        timestamp: formatRelativeTime(item.published ?? item.article_created_at),
        headline: item.title,
        tags: [],
        aiSummaryAvailable: false,
        commentsCount: 0,
        imageUrl: item.image_url ?? "",
      }
      onArticleClick(article)
    }
  }

  const handleStyleSelect = (styleId: AvatarStyle) => {
    setAvatarStyle(styleId)
    onUpdateUser({ avatarStyle: styleId })
  }

  // Keep local state in sync if parent session updates
  useEffect(() => {
    setAvatarStyle(user.avatarStyle ?? "initials")
  }, [user.avatarStyle])

  const handleThemeToggle = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    const theme = next ? "dark" : "light"
    if (next) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("tickfeed-theme", theme)
    onUpdateUser({ theme })
  }

  const initials = useMemo(() => {
    const f = user.firstName ?? ""
    const l = user.lastName ?? ""
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || "?"
  }, [user.firstName, user.lastName])

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
    },
  })

  // Sync form when user changes
  useEffect(() => {
    form.reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
    })
  }, [user, form])

  const handleSave = async (values: EditFormValues) => {
    setSaving(true)
    try {
      const result = await onUpdateUser({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      })
      if ("error" in result) {
        if (result.field === "username") {
          form.setError("username", { message: result.error })
        } else {
          toast({ title: "Update failed", description: result.error })
        }
        return
      }
      toast({ title: "Profile updated" })
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background px-4 pb-2 pt-4">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Profile card */}
        <button
          onClick={() => setEditOpen(true)}
          className="mx-4 mt-2 block w-[calc(100%-2rem)] rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-left transition-colors active:bg-primary/10"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/30">
              {avatarStyle !== "initials" && user.username && (
                <AvatarImage src={dicebearUrl(avatarStyle, user.username)} alt={initials} />
              )}
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">{user.firstName} {user.lastName}</h2>
              <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Premium</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full p-2 text-muted-foreground">
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </button>

        {/* Stats */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {stats == null ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-muted" /> : stats.articles_interacted}
            </div>
            <div className="text-xs text-muted-foreground">Articles Interacted</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {stats == null ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-muted" /> : stats.stocks_interacted}
            </div>
            <div className="text-xs text-muted-foreground">Stocks Interacted</div>
          </div>
        </div>

        {/* Alpha Score card */}
        {(() => {
          const score = myProfile ? calcAlphaScore(myProfile.posts_count, myProfile.likes_received, myProfile.followers_count) : null
          const tier = score != null ? alphaTier(score) : null
          const next = score != null ? alphaNextTier(score) : null
          const prevMin = tier ? tier.min : 0
          const progress = next && score != null ? Math.min(((score - prevMin) / (next.min - prevMin)) * 100, 100) : 100
          return (
            <button
              onClick={() => setShowRankings(true)}
              className={`mx-4 mt-4 w-[calc(100%-2rem)] rounded-xl border p-4 text-left transition-colors active:opacity-80 ${tier ? tier.border : "border-border"} ${tier ? tier.bg : "bg-muted"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${tier ? tier.color : "text-muted-foreground"}`} />
                  <span className="text-sm font-bold text-foreground">Alpha Score</span>
                </div>
                {tier && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tier.border} ${tier.bg} ${tier.color}`}>
                    {tier.label} ›
                  </span>
                )}
              </div>
              <div className={`text-3xl font-black mb-1 ${tier ? tier.color : "text-foreground"}`}>
                {score == null ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted/60" /> : score.toLocaleString()}
              </div>
              {next && score != null && (
                <>
                  <div className="h-1.5 w-full rounded-full bg-background/60 overflow-hidden mb-1">
                    <div className={`h-full rounded-full transition-all ${tier?.barBg ?? "bg-primary"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{next.min - score} pts to <span className="font-semibold">{next.label}</span></p>
                </>
              )}
              {score != null && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Posts", value: myProfile!.posts_count, pts: "×15" },
                    { label: "Likes", value: myProfile!.likes_received, pts: "×8" },
                    { label: "Followers", value: myProfile!.followers_count, pts: "×25" },
                  ].map(({ label, value, pts }) => (
                    <div key={label} className="rounded-lg bg-background/50 px-2 py-1.5">
                      <p className="text-sm font-bold text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label} <span className="opacity-60">{pts}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })()}

        {/* Following list */}
        <div className="mx-4 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Following</h3>
              {following != null && following.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{following.length}</span>
              )}
            </div>
          </div>
          {following === null ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : following.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Not following anyone yet.</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">Follow investors in the Community tab.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {following.map((u) => {
                const name = u.first_name ? `${u.first_name}${u.last_name ? " " + u.last_name : ""}` : u.username ?? "User"
                const initials = (u.first_name?.[0] ?? u.username?.[0] ?? "?").toUpperCase() + (u.last_name?.[0] ?? "").toUpperCase()
                const avatarSrc = u.avatar_style && u.avatar_style !== "initials" && u.username ? apiBearUrl(u.avatar_style, u.username) : ""
                const score = calcAlphaScore(u.posts_count, u.likes_received, u.followers_count)
                const tier = alphaTier(score)
                return (
                  <button
                    key={u.id}
                    onClick={() => handleUserClick(u.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div className={`relative h-12 w-12 rounded-full border-2 overflow-hidden ${tier.border} group-active:scale-95 transition-transform`}>
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={initials} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                          {initials}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground font-medium truncate max-w-[52px]">{name.split(" ")[0]}</p>
                    <p className={`text-[10px] font-semibold ${tier.color}`}>{tier.label}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <div className="mx-4 mt-6">
          <button
            onClick={handleThemeToggle}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                {isDarkMode ? <Moon className="h-5 w-5 text-foreground" /> : <Sun className="h-5 w-5 text-foreground" />}
              </div>
              <div className="text-left">
                <span className="font-medium text-foreground">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                <p className="text-xs text-muted-foreground">Tap to toggle theme</p>
              </div>
            </div>
            <div className={`relative h-6 w-12 rounded-full transition-colors ${isDarkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${isDarkMode ? "left-7" : "left-1"}`} />
            </div>
          </button>
        </div>

        {/* Menu items */}
        <div className="mx-4 mt-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const onClick = "action" in item
              ? item.action === "history" ? handleOpenHistory
              : item.action === "support" ? () => setShowSupport(true)
              : undefined
              : undefined
            return (
              <button
                key={item.label}
                onClick={onClick}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.hasArrow ? <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" /> : null}
              </button>
            )
          })}
        </div>

        {/* Sign out */}
        <div className="mx-4 mt-4">
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">TickFeed v1.0.0</p>
        </div>
      </div>

      {/* User profile sheet */}
      {(selectedUser || userProfileLoading) && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-background">
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
            <button
              onClick={() => setSelectedUser(null)}
              className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="font-bold text-base text-foreground">Profile</h2>
          </div>
          {userProfileLoading && !selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : selectedUser && (() => {
            const u = selectedUser
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "User"
            const ini = ((u.first_name?.[0] ?? u.username?.[0] ?? "?") + (u.last_name?.[0] ?? "")).toUpperCase()
            const avatarSrc = u.avatar_style && u.avatar_style !== "initials" && u.username ? apiBearUrl(u.avatar_style, u.username) : ""
            const score = calcAlphaScore(u.posts_count, u.likes_received, u.followers_count)
            const tier = alphaTier(score)
            const next = alphaNextTier(score)
            const prevMin = tier.min
            const progress = next ? Math.min(((score - prevMin) / (next.min - prevMin)) * 100, 100) : 100
            return (
              <div className="flex-1 overflow-y-auto pb-8">
                {/* Avatar + name */}
                <div className="flex flex-col items-center pt-8 pb-6 px-6">
                  <div className={`h-20 w-20 rounded-full border-2 overflow-hidden mb-3 ${tier.border}`}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={ini} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-primary-foreground">{ini}</div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{name}</h3>
                  <p className="text-sm text-muted-foreground">@{u.username ?? "user"}</p>

                  {/* Follow button */}
                  <button
                    onClick={() => handleFollowToggle(u)}
                    className={`mt-4 rounded-full px-6 py-2 text-sm font-semibold border transition-colors ${
                      u.is_following
                        ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                        : "border-primary bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {u.is_following ? "Following" : "Follow"}
                  </button>
                </div>

                {/* Alpha Score */}
                <div className={`mx-4 rounded-xl border p-4 ${tier.border} ${tier.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${tier.color}`} />
                      <span className="text-sm font-bold text-foreground">Alpha Score</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tier.border} ${tier.bg} ${tier.color}`}>
                      {tier.label}
                    </span>
                  </div>
                  <div className={`text-3xl font-black mb-1 ${tier.color}`}>{score.toLocaleString()}</div>
                  {next && (
                    <>
                      <div className="h-1.5 w-full rounded-full bg-background/60 overflow-hidden mb-1">
                        <div className={`h-full rounded-full transition-all ${tier.barBg}`} style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{next.min - score} pts to <span className="font-semibold">{next.label}</span></p>
                    </>
                  )}

                </div>

                {/* Social stats */}
                <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: "Posts",     value: u.posts_count },
                    { label: "Followers", value: u.followers_count },
                    { label: "Following", value: u.following_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Posts */}
                <div className="mt-5">
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Posts
                  </p>
                  {userPostsLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="px-4 py-4 border-b border-border/50 animate-pulse">
                        <div className="flex gap-2 mb-2">
                          <div className="h-3 w-16 rounded bg-muted" />
                          <div className="h-3 w-12 rounded bg-muted" />
                        </div>
                        <div className="h-4 w-full rounded bg-muted mb-1" />
                        <div className="h-4 w-3/4 rounded bg-muted" />
                      </div>
                    ))
                  ) : userPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No posts yet</p>
                    </div>
                  ) : (
                    userPosts.map((post) => (
                      <div key={post.id} className="border-b border-border/50 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          {post.symbol && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {post.symbol}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(post.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        {post.image_url && (
                          <img src={post.image_url} alt="" className="mt-2 rounded-lg w-full object-cover max-h-52" />
                        )}
                        <div className="flex gap-4 mt-2.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3.5 w-3.5" />{post.likes_count}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />{post.comments_count}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Rankings sheet */}
      {showRankings && (() => {
        const score = myProfile ? calcAlphaScore(myProfile.posts_count, myProfile.likes_received, myProfile.followers_count) : null
        const currentTier = score != null ? alphaTier(score) : null
        const nextTier = score != null ? alphaNextTier(score) : null
        return (
          <Sheet open onOpenChange={() => setShowRankings(false)}>
            <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 pt-5 h-[85dvh] flex flex-col">
              <SheetHeader className="mb-1 px-5 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Alpha Rankings
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Earn points by posting, getting likes and gaining followers</p>
              </SheetHeader>

              {/* Current score banner */}
              {score != null && currentTier && (
                <div className={`mx-5 mb-4 rounded-xl border p-3 ${currentTier.border} ${currentTier.bg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Your score</p>
                      <p className={`text-2xl font-black ${currentTier.color}`}>{score.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${currentTier.border} ${currentTier.bg} ${currentTier.color}`}>
                        {currentTier.label}
                      </span>
                      {nextTier && (
                        <p className="text-[10px] text-muted-foreground mt-1">{nextTier.min - score} pts to {nextTier.label}</p>
                      )}
                    </div>
                  </div>
                  {nextTier && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-background/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${currentTier.barBg}`}
                        style={{ width: `${Math.min(((score - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tier ladder */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
                {[...ALPHA_TIERS].reverse().map((t, i) => {
                  const isCurrent = currentTier?.label === t.label
                  const isUnlocked = score != null && score >= t.min
                  const tierIdx = ALPHA_TIERS.indexOf(t)
                  const prevT = ALPHA_TIERS[tierIdx + 1] // tier below
                  return (
                    <div
                      key={t.label}
                      className={`relative rounded-xl border p-3.5 transition-all ${
                        isCurrent
                          ? `${t.border} ${t.bg} ring-2 ring-inset ${t.border.replace("border-", "ring-")}`
                          : isUnlocked
                          ? `${t.border} ${t.bg} opacity-80`
                          : "border-border bg-muted/30 opacity-40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${t.border} ${t.bg}`}>
                          <Zap className={`h-4 w-4 ${isUnlocked ? t.color : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isUnlocked ? t.color : "text-muted-foreground"}`}>{t.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">YOU</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-semibold ${isUnlocked ? t.color : "text-muted-foreground"}`}>
                            {t.min === 0 ? "0+" : `${t.min.toLocaleString()}+`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">pts</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* How to earn points */}
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">How to earn points</p>
                  <div className="space-y-1.5">
                    {[
                      { action: "Write a post",    pts: "+15 pts" },
                      { action: "Get a like",       pts: "+8 pts"  },
                      { action: "Gain a follower",  pts: "+25 pts" },
                    ].map(({ action, pts }) => (
                      <div key={action} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{action}</span>
                        <span className="text-[11px] font-semibold text-primary">{pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )
      })()}

      {/* Interaction history sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 pt-5 h-[80dvh] flex flex-col">
          <SheetHeader className="mb-3 px-5 text-left">
            <SheetTitle className="text-lg">Interaction History</SheetTitle>
            <p className="text-xs text-muted-foreground">Articles and stocks you've explored</p>
          </SheetHeader>

          {/* Tabs */}
          {(() => {
            const articles = history?.filter((i) => i.type === "article") ?? []
            const stocks   = history?.filter((i) => i.type === "stock")   ?? []
            return (
              <>
                {/* Tab bar */}
                <div className="flex border-b border-border px-5">
                  {(["articles", "stocks"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab)}
                      className={`mr-6 pb-2.5 text-sm font-medium transition-colors ${
                        historyTab === tab
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "articles" ? "Articles" : "Stocks"}
                      {!historyLoading && history && (
                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                          historyTab === tab ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {tab === "articles" ? articles.length : stocks.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                  {historyLoading ? (
                    <div className="space-y-3 px-5 pt-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-lg bg-muted" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : historyTab === "articles" ? (
                    articles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                        <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">No articles yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Chat with AI on any article — it'll appear here.</p>
                      </div>
                    ) : (
                      <div className="pb-8">
                        {articles.map((item) => (
                          <button
                            key={`a-${item.id}`}
                            onClick={() => handleHistoryItemClick(item)}
                            className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                          >
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt=""
                                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                              />
                            ) : (
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Newspaper className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 text-left">
                              <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{item.title}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">{item.source}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{formatRelativeTime(item.interacted_at)}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    stocks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                        <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">No stocks yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Chat with AI on any stock — it'll appear here.</p>
                      </div>
                    ) : (
                      <div className="pb-8">
                        {stocks.map((item, idx) => (
                          <button
                            key={`s-${item.symbol}-${idx}`}
                            onClick={() => handleHistoryItemClick(item)}
                            className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                          >
                            <div
                              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                              style={{ backgroundColor: symbolToColor(item.symbol) }}
                            >
                              {symbolToLogo(item.symbol)}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-medium text-foreground">{item.title ?? item.symbol}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <TrendingUp className="h-3 w-3" />{item.symbol}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{formatRelativeTime(item.interacted_at)}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10 pt-5">
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="text-lg">Edit Profile</SheetTitle>
          </SheetHeader>

          {/* Avatar style picker */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20 border-2 border-border">
              {avatarStyle !== "initials" && user.username && (
                <AvatarImage src={dicebearUrl(avatarStyle, user.username)} alt={initials} />
              )}
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">Choose your avatar style</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleSelect(style.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                    avatarStyle === style.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                    {style.id === "initials" ? (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                        {initials}
                      </div>
                    ) : (
                      <img src={dicebearUrl(style.id, user.username)} alt={style.label} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className={`text-xs ${avatarStyle === style.id ? "font-medium text-primary" : "text-muted-foreground"}`}>{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">First name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-muted/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Last name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-muted/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">Username</FormLabel>
                    <FormControl>
                      <div className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-3 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                        <span className="select-none pr-1 text-sm font-medium text-muted-foreground">@</span>
                        <Input
                          {...field}
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="mt-2 h-12 w-full rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Help & Support overlay */}
      {showSupport && (
        <HelpSupportScreen token={token} onBack={() => setShowSupport(false)} />
      )}
    </div>
  )
}
