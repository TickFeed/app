"use client"

import { useEffect, useState } from "react"
import { HomeScreen } from "@/components/tickfeed/screens/home-screen"
import { WatchlistScreen } from "@/components/tickfeed/screens/watchlist-screen"
import { StockDetailScreen } from "@/components/tickfeed/screens/stock-detail-screen"
import { AddStockScreen } from "@/components/tickfeed/screens/add-stock-screen"
import { ArticleDetailScreen } from "@/components/tickfeed/screens/article-detail-screen"
import { CommunityScreen } from "@/components/tickfeed/screens/community-screen"
import { ProfileScreen } from "@/components/tickfeed/screens/profile-screen"
import { AuthScreen } from "@/components/tickfeed/screens/auth-screen"
import { NotificationsScreen } from "@/components/tickfeed/screens/notifications-screen"
import { BottomNav } from "@/components/tickfeed/bottom-nav"
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
import { toast } from "@/hooks/use-toast"

export type Screen = "home" | "watchlist" | "stock-detail" | "add-stock" | "community" | "profile" | "article-detail" | "notifications"

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
}


function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('tickfeed-theme', theme)
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
    else if (tab === "community") setCurrentScreen("community")
    else if (tab === "profile") setCurrentScreen("profile")
  }

  const handleNewsClick = (article: NewsArticle) => {
    setSelectedArticle(article)
    setArticleInitialTab(undefined)
    setPreviousScreen(currentScreen)
    setCurrentScreen("article-detail")
  }

  const handleBackFromArticle = () => {
    setCurrentScreen(previousScreen)
    setSelectedArticle(null)
    setArticleInitialTab(undefined)
  }

  const handleStockClick = (symbol: string) => {
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
    setCurrentScreen("home") // reset first
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
      setPreviousScreen("notifications")
      setCurrentScreen("article-detail")
    } catch {
      // If fetch fails, just go home
    }
  }

  const handleNotificationNavigateToStock = (symbol: string, tab?: string) => {
    setSelectedStock(symbol)
    setStockInitialTab(tab as "overview" | "ai-chat" | "discuss" | undefined)
    setPreviousScreen("notifications")
    setCurrentScreen("stock-detail")
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
  }

  const handleGoogleSuccess = async (idToken: string) => {
    setIsAuthSubmitting(true)
    try {
      const result = await signInWithGoogle(idToken)
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

  const handleUpdateUser = async (fields: { firstName?: string; lastName?: string; username?: string; theme?: 'light' | 'dark' }) => {
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

  const handleSignOut = () => {
    clearAuthSession()
    setAuthSession(null)
    setAuthStep("method")
    setPendingEmail("")
    setRegistrationToken(null)
    resetShell()
    toast({ title: "Signed out", description: "You can sign back in anytime." })
  }

  const token = authSession?.token ?? ""

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return (
          <HomeScreen
            token={token}
            onNewsClick={handleNewsClick}
            onNotificationsClick={() => setCurrentScreen("notifications")}
          />
        )
      case "notifications":
        return (
          <NotificationsScreen
            token={token}
            onBack={() => setCurrentScreen("home")}
            onNavigateToArticle={handleNotificationNavigateToArticle}
            onNavigateToStock={handleNotificationNavigateToStock}
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
        return <CommunityScreen token={token} />
      case "profile":
        return authSession ? (
          <ProfileScreen user={authSession.user} token={token} onSignOut={handleSignOut} onGoToWatchlist={() => { setActiveTab("watchlist"); setCurrentScreen("watchlist") }} onUpdateUser={handleUpdateUser} />
        ) : null
      default:
        return <HomeScreen token={token} onNewsClick={handleNewsClick} onNotificationsClick={() => setCurrentScreen("notifications")} />
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
    currentScreen !== "notifications"

   return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
      {showBottomNav ? <BottomNav activeTab={activeTab} onTabChange={handleTabChange} /> : null}
    </div>
  )
}
