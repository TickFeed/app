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

export type Screen = "home" | "watchlist" | "stock-detail" | "add-stock" | "community" | "profile" | "article-detail"

export interface NewsArticle {
  id: string
  source: { name: string; icon: string }
  timestamp: string
  headline: string
  tags: string[]
  aiSummaryAvailable: boolean
  commentsCount: number
  imageUrl: string
  content?: string
}

interface Stock {
  symbol: string
  name: string
  price: string
  change: string
  isPositive: boolean
  updatesCount: number
  chartData: number[]
  logoColor: string
  logo: string
}

const INITIAL_STOCKS: Stock[] = [
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd.",
    price: "1,642.55",
    change: "1.28%",
    isPositive: true,
    updatesCount: 6,
    chartData: [40, 42, 38, 45, 48, 52, 50, 55, 58, 62, 60, 65],
    logoColor: "#dc2626",
    logo: "H",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Svcs.",
    price: "3,980.25",
    change: "2.18%",
    isPositive: true,
    updatesCount: 3,
    chartData: [50, 52, 48, 55, 58, 54, 60, 62, 58, 65, 70, 72],
    logoColor: "#1e40af",
    logo: "TCS",
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: "2,945.80",
    change: "0.28%",
    isPositive: false,
    updatesCount: 2,
    chartData: [60, 58, 62, 55, 52, 58, 54, 50, 48, 52, 50, 48],
    logoColor: "#0d9488",
    logo: "R",
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd.",
    price: "1,497.40",
    change: "1.02%",
    isPositive: true,
    updatesCount: 4,
    chartData: [45, 48, 42, 50, 52, 48, 55, 58, 54, 60, 62, 65],
    logoColor: "#2563eb",
    logo: "INF",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd.",
    price: "1,190.60",
    change: "0.65%",
    isPositive: true,
    updatesCount: 3,
    chartData: [52, 55, 50, 58, 60, 55, 62, 65, 60, 68, 70, 72],
    logoColor: "#dc2626",
    logo: "I",
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd.",
    price: "485.30",
    change: "1.45%",
    isPositive: true,
    updatesCount: 2,
    chartData: [30, 32, 28, 35, 38, 34, 40, 42, 38, 45, 48, 50],
    logoColor: "#7c3aed",
    logo: "W",
  },
]

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
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS)

  useEffect(() => {
    pruneStaleStorage()
    const theme = localStorage.getItem("tickfeed-theme")
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    const storedSession = loadAuthSession()
    if (storedSession) setAuthSession(storedSession)
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
    setPreviousScreen(currentScreen)
    setCurrentScreen("article-detail")
  }

  const handleBackFromArticle = () => {
    setCurrentScreen(previousScreen)
    setSelectedArticle(null)
  }

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol)
    setPreviousScreen(currentScreen)
    setCurrentScreen("stock-detail")
  }

  const handleBackFromStock = () => {
    setCurrentScreen("watchlist")
    setSelectedStock(null)
  }

  const handleRemoveStock = (symbol: string) => {
    setStocks((prev) => prev.filter((stock) => stock.symbol !== symbol))
  }

  const handleAddStockScreen = () => {
    setPreviousScreen(currentScreen)
    setCurrentScreen("add-stock")
  }

  const handleAddStock = (stock: Stock) => {
    setStocks((prev) => {
      if (prev.some((s) => s.symbol === stock.symbol)) return prev
      return [...prev, stock]
    })
  }

  const handleBackFromAddStock = () => {
    setCurrentScreen("watchlist")
    setActiveTab("watchlist")
  }

  const handleAuthenticated = (session: AuthSession) => {
    persistAuthSession(session)
    setAuthSession(session)
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

  const handleUpdateUser = async (fields: { firstName?: string; lastName?: string; username?: string }) => {
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

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNewsClick={handleNewsClick} />
      case "watchlist":
        return <WatchlistScreen stocks={stocks} onStockClick={handleStockClick} onAddStock={handleAddStockScreen} />
      case "add-stock":
        return (
          <AddStockScreen
            onBack={handleBackFromAddStock}
            onAddStock={handleAddStock}
            watchlistSymbols={stocks.map((s) => s.symbol)}
          />
        )
      case "stock-detail":
        return selectedStock ? (
          <StockDetailScreen symbol={selectedStock} onBack={handleBackFromStock} onRemove={handleRemoveStock} />
        ) : null
      case "article-detail":
        return selectedArticle ? (
          <ArticleDetailScreen article={selectedArticle} onBack={handleBackFromArticle} />
        ) : null
      case "community":
        return <CommunityScreen />
      case "profile":
        return authSession ? (
          <ProfileScreen user={authSession.user} onSignOut={handleSignOut} onUpdateUser={handleUpdateUser} />
        ) : null
      default:
        return <HomeScreen onNewsClick={handleNewsClick} />
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
    currentScreen !== "add-stock"

   return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
      {showBottomNav ? <BottomNav activeTab={activeTab} onTabChange={handleTabChange} /> : null}
    </div>
  )
}
