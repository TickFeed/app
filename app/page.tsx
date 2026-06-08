"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePushNotifications } from "@/lib/push"
import { useNativePush } from "@/lib/push-native"
import { updateStatusBar } from "@/lib/native"
import { useAndroidBackButton } from "@/lib/back-button"
import { clearAnalyticsUser, logEvent, logScreenView, setAnalyticsUser } from "@/lib/analytics"
import { HomeScreen, setHomeTabToFocus } from "@/components/tickfeed/screens/home-screen"
import { WatchlistScreen } from "@/components/tickfeed/screens/watchlist-screen"
import { StockDetailScreen } from "@/components/tickfeed/screens/stock-detail-screen"
import { AddStockScreen } from "@/components/tickfeed/screens/add-stock-screen"
import { ArticleDetailScreen } from "@/components/tickfeed/screens/article-detail-screen"
import { CommunityScreen } from "@/components/tickfeed/screens/community-screen"
import { ProfileScreen } from "@/components/tickfeed/screens/profile-screen"
import { AuthScreen } from "@/components/tickfeed/screens/auth-screen"
import { NotificationsScreen } from "@/components/tickfeed/screens/notifications-screen"
import { SearchScreen } from "@/components/tickfeed/screens/search-screen"
import { GlobalAIScreen } from "@/components/tickfeed/screens/global-ai-screen"
import { BottomNav } from "@/components/tickfeed/bottom-nav"
import { DailyCheckinSheet } from "@/components/tickfeed/daily-checkin-sheet"
import {
  clearAuthSession,
  completeProfile,
  loadAuthSession,
  persistAuthSession,
  pruneStaleStorage,
  requestEmailOtp,
  signInWithGoogle,
  updateProfile,
  verifyEmailOtp,
  type AuthSession,
  type AuthStep,
  type AuthUser,
  type NewUserProfile,
} from "@/lib/auth"
import { getUserPublicProfile, getTodayPoll, sendHeartbeat, castPollVote, type PublicUserProfile, type DailyPoll } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export type Screen = "home" | "watchlist" | "stock-detail" | "add-stock" | "community" | "profile" | "article-detail" | "notifications" | "search" | "ai"

export interface NewsArticle {
  id: string
  url?: string
  source: { name: string; icon: string }
  timestamp: string
  headline: string
  tags: string[]
  aiSummaryAvailable: boolean
  commentsCount: number
  imageUrl: string
  content?: string
  affectedSymbol?: string
}


function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('tickfeed-theme', theme)
  updateStatusBar(theme)
}

export default function TickFeedApp() {
  const [sessionBootstrapped, setSessionBootstrapped] = useState(false)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [authStep, setAuthStep] = useState<Exclude<AuthStep, "authenticated">>("method")
  const [pendingEmail, setPendingEmail] = useState("")
  const [registrationToken, setRegistrationToken] = useState<string | null>(null)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)

  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [previousScreen, setPreviousScreen] = useState<Screen>("home")
  const [activeTab, setActiveTab] = useState("home")
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [articleInitialTab, setArticleInitialTab] = useState<"ai-summary" | "ai-chat" | "discussions" | undefined>(undefined)
  const [stockInitialTab, setStockInitialTab] = useState<"overview" | "ai-chat" | "discuss" | undefined>(undefined)
  const [preArticlePreviousScreen, setPreArticlePreviousScreen] = useState<Screen>("home")
  const [initialCommunityPostId, setInitialCommunityPostId] = useState<number | undefined>(undefined)
  const [profileInitialUserId, setProfileInitialUserId] = useState<number | undefined>(undefined)
  const [profileInitialUser, setProfileInitialUser] = useState<PublicUserProfile | null>(null)
  const articleOpenedFromNotification = useRef(false)
  const currentScreenRef = useRef<Screen>("home")

  const [streakCount,      setStreakCount]      = useState(0)
  const [showCheckin,      setShowCheckin]      = useState(false)
  const [todayPoll,        setTodayPoll]        = useState<DailyPoll | null>(null)

  useEffect(() => {
    pruneStaleStorage()
    const storedSession = loadAuthSession()
    if (storedSession) {
      setAuthSession(storedSession)
      applyTheme(storedSession.user.theme)
    } else {
      const savedTheme = localStorage.getItem("tickfeed-theme") as 'light' | 'dark' | null
      applyTheme(savedTheme ?? 'light')
    }
    setSessionBootstrapped(true)
  }, [])

  // Keep ref in sync so heartbeat can read current screen without stale closure
  useEffect(() => { currentScreenRef.current = currentScreen }, [currentScreen])

  // Heartbeat on app open — updates streak; shows check-in sheet only on direct home opens
  useEffect(() => {
    const token = authSession?.token
    if (!token) return
    sendHeartbeat(token)
      .then(async ({ streakCount, isNewDay }) => {
        setStreakCount(streakCount)
        if (isNewDay) {
          // Fetch poll first so it's ready when the sheet opens
          const poll = await getTodayPoll(token).catch(() => null)
          setTodayPoll(poll)
          // Wait 350ms so any deep-link navigation has settled into currentScreen
          setTimeout(() => {
            if (currentScreenRef.current === "home") {
              setShowCheckin(true)
            }
          }, 350)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.token])

  const resetShell = () => {
    setCurrentScreen("home")
    setPreviousScreen("home")
    setActiveTab("home")
    setSelectedArticle(null)
    setSelectedStock(null)
  }

  const handleTabChange = (tab: string) => {
    if (tab === "add") {
      handleAddStockScreen()
      return
    }
    setActiveTab(tab)
    if (tab === "home") setCurrentScreen("home")
    else if (tab === "watchlist") setCurrentScreen("watchlist")
    else if (tab === "community") { setCurrentScreen("community"); setInitialCommunityPostId(undefined) }
    else if (tab === "profile") setCurrentScreen("profile")
    else if (tab === "ai") setCurrentScreen("ai")
  }

  const handleNewsClick = (article: NewsArticle) => {
    logEvent("article_open", { article_id: article.id, source: article.source.name })
    setSelectedArticle(article)
    setArticleInitialTab(undefined)
    setPreArticlePreviousScreen(previousScreen)
    setPreviousScreen(currentScreen)
    setCurrentScreen("article-detail")
  }

  const handleBackFromArticle = () => {
    if (articleOpenedFromNotification.current) {
      articleOpenedFromNotification.current = false
      // Only activate focus mode when landing directly on home, not on an
      // intermediate screen like notifications (which would then mount Home
      // in focus mode when its own back is pressed, triggering an error).
      if (previousScreen === "home") setHomeTabToFocus()
    }
    setCurrentScreen(previousScreen)
    setPreviousScreen(preArticlePreviousScreen)
    setSelectedArticle(null)
    setArticleInitialTab(undefined)
  }

  const handleStockClick = (symbol: string) => {
    logEvent("stock_view", { symbol })
    setSelectedStock(symbol)
    setStockInitialTab(undefined)
    setPreviousScreen(currentScreen)
    setCurrentScreen("stock-detail")
  }

  const handleBackFromStock = () => {
    setCurrentScreen(previousScreen)
    setSelectedStock(null)
    setStockInitialTab(undefined)
  }

  // Navigate from a notification to the right screen + tab
  const handleNotificationNavigateToArticle = async (newsId: number, tab?: string) => {
    const origin = currentScreen  // preserve so back returns here
    try {
      const { getArticleDetail } = await import("@/lib/api")
      const detail = await getArticleDetail(token, newsId)
      const article: NewsArticle = {
        id: String(detail.id),
        url: detail.url,
        source: { name: detail.source, icon: "" },
        timestamp: detail.published ?? detail.created_at,
        headline: detail.title,
        tags: [],
        aiSummaryAvailable: detail.priority === "HIGH",
        commentsCount: 0,
        imageUrl: detail.image_url ?? "",
      }
      setSelectedArticle(article)
      setArticleInitialTab(tab as "ai-summary" | "ai-chat" | "discussions" | undefined)
      setPreArticlePreviousScreen(previousScreen)
      setPreviousScreen(origin)
      articleOpenedFromNotification.current = true
      setCurrentScreen("article-detail")
    } catch {
      // If fetch fails, stay on current screen
    }
  }

  const handleNotificationNavigateToStock = (symbol: string, tab?: string) => {
    setSelectedStock(symbol)
    setStockInitialTab(tab as "overview" | "ai-chat" | "discuss" | undefined)
    setPreviousScreen("notifications")
    setCurrentScreen("stock-detail")
  }

  const handleNotificationNavigateToCommunityPost = async (postId: number) => {
    try {
      const { getPostById } = await import("@/lib/api")
      // Walk reply_to_id chain to find the root post (max 10 hops as safety limit)
      let post = await getPostById(token, postId)
      let depth = 0
      while (post.reply_to_id && depth < 10) {
        post = await getPostById(token, post.reply_to_id)
        depth++
      }
      setInitialCommunityPostId(post.id)
    } catch {
      // If fetch fails, try navigating with the original ID anyway
      setInitialCommunityPostId(postId)
    }
    setCurrentScreen("community")
    setActiveTab("community")
  }

  const handleAddStockScreen = () => {
    setPreviousScreen(currentScreen)
    setCurrentScreen("add-stock")
  }

  const handleBackFromAddStock = () => {
    setCurrentScreen("watchlist")
    setActiveTab("watchlist")
  }

  const handleAuthenticated = (session: AuthSession) => {
    persistAuthSession(session)
    setAuthSession(session)
    applyTheme(session.user.theme)
    setAuthStep("method")
    setPendingEmail("")
    setRegistrationToken(null)
    resetShell()
    logEvent("login", { method: session.user.email ? "email" : "google" })
  }

  const handleGoogleSuccess = async (token: string, tokenType: 'access_token' | 'id_token') => {
    setIsAuthSubmitting(true)
    try {
      const result = await signInWithGoogle(token, tokenType)
      if (result.status === "error") {
        toast({ title: "Google sign-in failed", description: result.message })
        return
      }
      handleAuthenticated(result.session)
      toast({
        title: `Welcome, ${result.user.firstName || result.user.email}`,
        description: "Your personalized market feed is ready.",
      })
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSubmitEmail = async (email: string) => {
    setIsAuthSubmitting(true)
    try {
      const result = await requestEmailOtp(email)
      setPendingEmail(result.email)
      setAuthStep("otp")
      toast({ title: "Code sent", description: `Check ${result.email} for your verification code.` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      toast({
        title: "Could not send code",
        description: msg.includes("fetch") ? "Could not reach the server. Check your connection." : (msg || "Please try again."),
      })
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSubmitOtp = async (otp: string) => {
    setIsAuthSubmitting(true)
    try {
      const result = await verifyEmailOtp(pendingEmail, otp)

      if (result.status === "error") {
        toast({ title: "Verification failed", description: result.message })
        return
      }

      if (result.status === "existing-user") {
        handleAuthenticated(result.session)
        toast({
          title: `Welcome back, ${result.user.firstName}`,
          description: "Your personalized market feed is ready.",
        })
        return
      }

      setPendingEmail(result.email)
      setRegistrationToken(result.registrationToken)
      setAuthStep("profile")
      toast({ title: "Almost done", description: "Complete your profile to start using TickFeed." })
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSubmitProfile = async (profile: NewUserProfile) => {
    if (!registrationToken) {
      toast({ title: "Session expired", description: "Please verify your email again." })
      setAuthStep("method")
      return
    }
    setIsAuthSubmitting(true)
    try {
      const result = await completeProfile({ email: pendingEmail, registrationToken, profile })

      if (result.status === "error") {
        toast({ title: "Could not complete signup", description: result.message })
        return
      }

      handleAuthenticated(result.session)
      toast({ title: `Welcome to TickFeed, ${result.user.firstName}`, description: "Your account is ready." })
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    setIsAuthSubmitting(true)
    try {
      await requestEmailOtp(pendingEmail)
      toast({ title: "Code resent", description: `We sent a fresh code to ${pendingEmail}.` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      toast({
        title: "Could not resend code",
        description: msg.includes("fetch") ? "Could not reach the server." : (msg || "Please try again."),
      })
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleBackToMethod = () => {
    setAuthStep("method")
    setRegistrationToken(null)
  }

  const handleUpdateUser = async (fields: { firstName?: string; lastName?: string; username?: string; theme?: 'light' | 'dark'; avatarStyle?: import("@/lib/auth").AvatarStyle }) => {
    if (!authSession) return { error: "Not authenticated" }
    const result = await updateProfile(authSession.token, fields)
    if ("error" in result && result.error === "session_expired") {
      handleSignOut()
      toast({ title: "Session expired", description: "Please sign in again." })
      return { error: "Session expired. Please sign in again." }
    }
    if ("user" in result) {
      const updatedSession = { ...authSession, user: result.user }
      persistAuthSession(updatedSession)
      setAuthSession(updatedSession)
    }
    return result
  }

  const handleSignOut = async () => {
    logEvent("logout")
    clearAuthSession()
    setAuthSession(null)
    setAuthStep("method")
    setPendingEmail("")
    setRegistrationToken(null)
    resetShell()
    toast({ title: "Signed out", description: "You can sign back in anytime." })
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      await GoogleAuth.signOut()
    } catch {
      // not native or already signed out — ignore
    }
  }

  const token = authSession?.token ?? ""

  // Track screen views; clear profile-user state when leaving profile
  useEffect(() => {
    logScreenView(currentScreen)
    if (currentScreen !== "profile") {
      setProfileInitialUserId(undefined)
      setProfileInitialUser(null)
    }
  }, [currentScreen])

  // Set / clear analytics user identity
  useEffect(() => {
    if (authSession?.user?.id) setAnalyticsUser(String(authSession.user.id))
    else clearAnalyticsUser()
  }, [authSession?.user?.id])

  // Web Push (VAPID) — browser / PWA
  usePushNotifications(authSession ? token : null)

  // Refs so push/SW handlers (registered once) always call the latest navigate functions
  const notifNavArticleRef = useRef(handleNotificationNavigateToArticle)
  useEffect(() => { notifNavArticleRef.current = handleNotificationNavigateToArticle })
  const notifNavStockRef = useRef(handleNotificationNavigateToStock)
  useEffect(() => { notifNavStockRef.current = handleNotificationNavigateToStock })
  const notifNavCommunityRef = useRef(handleNotificationNavigateToCommunityPost)
  useEffect(() => { notifNavCommunityRef.current = handleNotificationNavigateToCommunityPost })

  // Native push (FCM) — Capacitor Android
  const handleNativePushTap = (data: { target_type?: string; target_id?: string; target_tab?: string; source_post_id?: string }) => {
    const { target_type, target_id, target_tab, source_post_id } = data
    if (target_type === "article" && target_id) {
      notifNavArticleRef.current(Number(target_id), target_tab)
    } else if (target_type === "stock" && target_id) {
      notifNavStockRef.current(target_id, target_tab)
    } else if (source_post_id) {
      notifNavCommunityRef.current(Number(source_post_id))
    } else {
      setActiveTab("home")
      setCurrentScreen("notifications")
    }
  }
  useNativePush(authSession ? token : null, handleNativePushTap)

  // Android hardware/gesture back button
  const lastBackPressRef = useRef(0)
  const handleAndroidBack = useCallback((): boolean => {
    if (currentScreen === "article-detail") { handleBackFromArticle(); return true }
    if (currentScreen === "stock-detail")   { handleBackFromStock();   return true }
    if (currentScreen === "add-stock")      { handleBackFromAddStock(); return true }
    if (currentScreen !== "home") {
      setCurrentScreen("home")
      setActiveTab("home")
      return true
    }
    // On home root — double-tap to exit
    const now = Date.now()
    if (now - lastBackPressRef.current < 2000) return false
    lastBackPressRef.current = now
    toast({ title: "Press back again to exit" })
    return true
  }, [currentScreen, handleBackFromArticle, handleBackFromStock, handleBackFromAddStock])
  useAndroidBackButton(handleAndroidBack)

  // Handle App Links (Android) — fires when the app is opened or resumed via an https://tickfeed.in URL.
  // Uses refs so the listener registered once always calls the latest navigation functions.
  const authSessionRef = useRef(authSession)
  useEffect(() => { authSessionRef.current = authSession }, [authSession])
  useEffect(() => {
    let cleanup: (() => void) | undefined
    const setup = async () => {
      try {
        const { App } = await import("@capacitor/app")
        const handle = await App.addListener("appUrlOpen", (event) => {
          if (!authSessionRef.current) return
          try {
            const url = new URL(event.url)
            const params = url.searchParams
            const postId = params.get("post")
            const articleId = params.get("article")
            const stockSym = params.get("stock")
            const tab = params.get("tab") ?? undefined
            if (postId) {
              notifNavCommunityRef.current(Number(postId))
            } else if (articleId) {
              notifNavArticleRef.current(Number(articleId), tab)
            } else if (stockSym) {
              notifNavStockRef.current(stockSym, tab)
            }
          } catch { /* ignore malformed URLs */ }
        })
        cleanup = () => handle.remove()
      } catch { /* not running in Capacitor */ }
    }
    setup()
    return () => cleanup?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle notification deep-links: ?post=ID, ?article=ID&tab=TAB, ?stock=SYM&tab=TAB
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (!authSession || deepLinkHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const postId = params.get("post")
    const articleId = params.get("article")
    const stockSym = params.get("stock")
    const tab = params.get("tab") ?? undefined
    if (postId || articleId || stockSym) {
      deepLinkHandled.current = true
      window.history.replaceState({}, "", "/")
      if (postId) {
        setInitialCommunityPostId(Number(postId))
        setCurrentScreen("community")
        setActiveTab("community")
      } else if (articleId) {
        handleNotificationNavigateToArticle(Number(articleId), tab)
      } else if (stockSym) {
        handleNotificationNavigateToStock(stockSym, tab)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession])

  // Listen for notification-click messages from the service worker (foreground)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "notification_click") return
      const url = new URL(event.data.url, window.location.origin)
      const params = url.searchParams
      const postId = params.get("post")
      const articleId = params.get("article")
      const stockSym = params.get("stock")
      const tab = params.get("tab") ?? undefined
      if (postId) {
        setInitialCommunityPostId(Number(postId))
        setCurrentScreen("community")
        setActiveTab("community")
      } else if (articleId) {
        notifNavArticleRef.current(Number(articleId), tab)
      } else if (stockSym) {
        notifNavStockRef.current(stockSym, tab)
      }
    }
    navigator.serviceWorker.addEventListener("message", handler)
    return () => navigator.serviceWorker.removeEventListener("message", handler)
  }, []) // refs are stable — safe to omit deps

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return (
          <HomeScreen
            token={token}
            streakCount={streakCount}
            onStreakBadgeClick={async () => {
              if (todayPoll === null && authSession?.token) {
                const poll = await getTodayPoll(authSession.token).catch(() => null)
                setTodayPoll(poll)
              }
              setShowCheckin(true)
            }}
            onNewsClick={handleNewsClick}
            onNotificationsClick={() => setCurrentScreen("notifications")}
            onSearchClick={() => setCurrentScreen("search")}
          />
        )
      case "search":
        return (
          <SearchScreen
            token={token}
            onBack={() => setCurrentScreen("home")}
            onArticleClick={(article) => {
              handleNewsClick(article)
            }}
          />
        )
      case "notifications":
        return (
          <NotificationsScreen
            token={token}
            onBack={() => { setCurrentScreen("home"); setActiveTab("home") }}
            onNavigateToArticle={handleNotificationNavigateToArticle}
            onNavigateToStock={handleNotificationNavigateToStock}
            onNavigateToCommunityPost={handleNotificationNavigateToCommunityPost}
          />
        )
      case "watchlist":
        return <WatchlistScreen token={token} onStockClick={handleStockClick} onAddStock={handleAddStockScreen} />
      case "add-stock":
        return (
          <AddStockScreen
            token={token}
            onBack={handleBackFromAddStock}
          />
        )
      case "stock-detail":
        return selectedStock ? (
          <StockDetailScreen
            token={token}
            symbol={selectedStock}
            onBack={handleBackFromStock}
            onArticleClick={handleNewsClick}
            initialTab={stockInitialTab}
          />
        ) : null
      case "article-detail":
        return selectedArticle ? (
          <ArticleDetailScreen
            token={token}
            article={selectedArticle}
            onBack={handleBackFromArticle}
            initialTab={articleInitialTab}
          />
        ) : null
      case "community":
        return (
          <CommunityScreen
            token={token}
            initialPostId={initialCommunityPostId}
            onUserClick={async (userId) => {
              if (authSession && String(userId) === authSession.user.id) return
              setProfileInitialUserId(userId)
              setActiveTab("profile")
              setCurrentScreen("profile")
              try {
                const profile = await getUserPublicProfile(token, userId)
                setProfileInitialUser(profile)
              } catch {}
            }}
          />
        )
      case "profile":
        return authSession ? (
          <ProfileScreen
            key={profileInitialUserId ?? 0}
            user={authSession.user}
            token={token}
            onSignOut={handleSignOut}
            onGoToWatchlist={() => { setActiveTab("watchlist"); setCurrentScreen("watchlist") }}
            onArticleClick={handleNewsClick}
            onStockClick={handleStockClick}
            onUpdateUser={handleUpdateUser}
            initialUserId={profileInitialUserId}
            initialUser={profileInitialUser}
          />
        ) : null
      case "ai":
        return <GlobalAIScreen token={token} />
      default:
        return <HomeScreen token={token} streakCount={streakCount} onNewsClick={handleNewsClick} onNotificationsClick={() => setCurrentScreen("notifications")} />
    }
  }

  if (!sessionBootstrapped) {
    return <div className="flex h-[100dvh] items-center justify-center bg-background" />
  }

  if (!authSession) {
    return (
      <AuthScreen
        step={authStep}
        email={pendingEmail}
        isSubmitting={isAuthSubmitting}
        onGoogleSuccess={handleGoogleSuccess}
        onGoogleError={() =>
          toast({ title: "Google sign-in failed", description: "Please try again or use email." })
        }
        onSubmitEmail={handleSubmitEmail}
        onSubmitOtp={handleSubmitOtp}
        onSubmitProfile={handleSubmitProfile}
        onBackToMethod={handleBackToMethod}
        onResendOtp={handleResendOtp}
      />
    )
  }

  const showBottomNav =
    currentScreen !== "article-detail" &&
    currentScreen !== "stock-detail" &&
    currentScreen !== "add-stock" &&
    currentScreen !== "notifications" &&
    currentScreen !== "search"

   return (
    <div className="flex h-[100dvh] flex-col bg-background safe-area-pt">
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
      {showBottomNav ? <BottomNav activeTab={activeTab} onTabChange={handleTabChange} /> : null}
      {showCheckin && authSession?.token && (
        <DailyCheckinSheet
          streakCount={streakCount}
          poll={todayPoll}
          onVote={(pollId, optionIdx) => castPollVote(authSession.token, pollId, optionIdx)}
          onClose={() => setShowCheckin(false)}
        />
      )}
    </div>
  )
}
