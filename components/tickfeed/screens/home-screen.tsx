"use client"

import { useState } from "react"
import { Search, Bell, TrendingUp } from "lucide-react"
import { MarketDigest } from "../market-digest"
import { MarketTicker } from "../market-ticker"
import { NewsCard } from "../news-card"
import type { NewsArticle } from "@/app/page"

interface HomeScreenProps {
  onNewsClick?: (article: NewsArticle) => void
}

const TABS = ["For You", "My Stocks", "All News"]

const MARKET_DATA = [
  { symbol: "NIFTY", value: "22,327.55", change: "1.15%", isPositive: true },
  { symbol: "SENSEX", value: "73,678.05", change: "1.24%", isPositive: true },
  { symbol: "USD/INR", value: "83.12", change: "0.12%", isPositive: false },
]

const NEWS_ITEMS: NewsArticle[] = [
  {
    id: "1",
    source: { name: "The Economic Times", icon: "ET" },
    timestamp: "20m",
    headline: "RBI keeps rates unchanged, maintains neutral stance",
    tags: ["RBI", "Monetary Policy"],
    aiSummaryAvailable: true,
    commentsCount: 126,
    imageUrl: "/rbi-news.jpg",
    content: "The Reserve Bank of India (RBI) has decided to keep the repo rate unchanged at 6.50% in its latest monetary policy meeting. The central bank maintained its neutral stance, focusing on managing inflation while supporting economic growth.",
  },
  {
    id: "2",
    source: { name: "Moneycontrol", icon: "M" },
    timestamp: "45m",
    headline: "HDFC Bank Q4 profit up 18%; asset quality improves",
    tags: ["HDFCBANK", "Earnings"],
    aiSummaryAvailable: true,
    commentsCount: 89,
    imageUrl: "/hdfc-news.jpg",
    content: "HDFC Bank reported an 18% year-on-year rise in its Q4 net profit, driven by improved asset quality and strong loan growth. The bank's net interest income grew by 24.5% to Rs 29,077 crore.",
  },
  {
    id: "3",
    source: { name: "Business Standard", icon: "BS" },
    timestamp: "1h",
    headline: "TCS wins $500M deal from US-based client",
    tags: ["TCS", "IT Sector"],
    aiSummaryAvailable: true,
    commentsCount: 54,
    imageUrl: "/tcs-news.jpg",
    content: "Tata Consultancy Services (TCS) has secured a landmark $500 million deal from a major US-based financial services client. The multi-year engagement will involve digital transformation and cloud migration services.",
  },
  {
    id: "4",
    source: { name: "LiveMint", icon: "LM" },
    timestamp: "2h",
    headline: "Reliance Industries plans $10B investment in green energy",
    tags: ["RELIANCE", "Green Energy"],
    aiSummaryAvailable: true,
    commentsCount: 167,
    imageUrl: "/reliance-news.jpg",
    content: "Reliance Industries has announced plans to invest $10 billion in green energy projects over the next three years. The investment will focus on solar manufacturing, hydrogen production, and battery storage facilities.",
  },
]

const ALL_NEWS: NewsArticle[] = [
  ...NEWS_ITEMS,
  {
    id: "5",
    source: { name: "CNBC TV18", icon: "CN" },
    timestamp: "3h",
    headline: "Infosys raises FY25 revenue guidance after strong Q4",
    tags: ["INFY", "IT Sector"],
    aiSummaryAvailable: true,
    commentsCount: 92,
    imageUrl: "/infosys-news.jpg",
    content: "Infosys has raised its FY25 revenue growth guidance to 4-7% in constant currency terms after posting better-than-expected Q4 results. The company reported a 7.9% YoY growth in net profit.",
  },
  {
    id: "6",
    source: { name: "Reuters", icon: "R" },
    timestamp: "4h",
    headline: "Global markets rally on Fed rate cut expectations",
    tags: ["Global", "Fed"],
    aiSummaryAvailable: true,
    commentsCount: 234,
    imageUrl: "/global-news.jpg",
    content: "Global stock markets rallied as investors grew more confident about potential Federal Reserve rate cuts later this year. The positive sentiment was driven by cooler-than-expected inflation data.",
  },
  {
    id: "7",
    source: { name: "Bloomberg", icon: "B" },
    timestamp: "5h",
    headline: "Adani Group stocks surge after Supreme Court ruling",
    tags: ["ADANI", "Legal"],
    aiSummaryAvailable: true,
    commentsCount: 312,
    imageUrl: "/adani-news.jpg",
    content: "Adani Group stocks surged across the board following a favorable Supreme Court ruling. The court dismissed petitions seeking an independent probe into the Hindenburg allegations.",
  },
  {
    id: "8",
    source: { name: "ET Now", icon: "ET" },
    timestamp: "6h",
    headline: "Auto sector outlook positive as rural demand recovers",
    tags: ["Auto", "Rural"],
    aiSummaryAvailable: true,
    commentsCount: 78,
    imageUrl: "/auto-news.jpg",
    content: "The auto sector outlook remains positive as rural demand shows signs of recovery. Two-wheeler and tractor sales are expected to grow by 8-10% in the coming quarter.",
  },
]

const MY_STOCKS_NEWS: NewsArticle[] = [
  NEWS_ITEMS[1], // HDFC
  NEWS_ITEMS[2], // TCS
  NEWS_ITEMS[3], // Reliance
]

export function HomeScreen({ onNewsClick }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState("For You")

  const getNewsForTab = () => {
    switch (activeTab) {
      case "For You":
        return NEWS_ITEMS
      case "My Stocks":
        return MY_STOCKS_NEWS
      case "All News":
        return ALL_NEWS
      default:
        return NEWS_ITEMS
    }
  }

  const currentNews = getNewsForTab()

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">Tick</span>
          <span className="text-primary">Feed</span>
        </h1>
        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 text-foreground hover:bg-muted transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button className="relative rounded-full p-2 text-foreground hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Market Digest - only show on For You */}
        {activeTab === "For You" && (
          <>
            <div className="px-4 pb-4">
              <MarketDigest
                headline="Sensex rises 1.2% as banking & IT stocks lead broad-based rally"
                subtext="Nifty reclaims 22,300. Positive global cues and strong FII inflows boost sentiment."
                date="8 May, 8:30 AM"
              />
            </div>
            <div className="px-4 pb-4">
              <MarketTicker items={MARKET_DATA} />
            </div>
          </>
        )}

        {/* Section Header */}
        <div className="border-t border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">
                {activeTab === "For You" && "Top News"}
                {activeTab === "My Stocks" && "Your Stock Updates"}
                {activeTab === "All News" && "Latest News"}
              </h2>
              {activeTab === "All News" && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {currentNews.length} articles
                </span>
              )}
            </div>
            {activeTab !== "All News" && (
              <button 
                onClick={() => setActiveTab("All News")}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                View all
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* News List */}
          <div>
            {currentNews.length > 0 ? (
              currentNews.map((item) => (
                <NewsCard
                  key={item.id}
                  source={item.source}
                  timestamp={item.timestamp}
                  headline={item.headline}
                  tags={item.tags}
                  aiSummaryAvailable={item.aiSummaryAvailable}
                  commentsCount={item.commentsCount}
                  imageUrl={item.imageUrl}
                  onClick={() => onNewsClick?.(item)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No news available</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Check back later for updates
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
