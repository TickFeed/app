"use client"

import { useState, useRef, useEffect } from "react"
import { 
  ChevronLeft, 
  MoreVertical, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  ExternalLink,
  Send,
  MessageCircle,
  Users,
  Bot,
  User,
  Heart,
  Reply,
  ChevronDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { NewsArticle } from "@/app/page"

interface ArticleDetailScreenProps {
  article: NewsArticle
  onBack?: () => void
}

type TabType = "ai-summary" | "ai-chat" | "discussions"

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
}

interface Discussion {
  id: string
  user: {
    name: string
    avatar: string
    badge?: string
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  isLiked?: boolean
}

const INITIAL_DISCUSSIONS: Discussion[] = [
  {
    id: "1",
    user: { name: "Rahul Sharma", avatar: "RS", badge: "Pro Trader" },
    content: "This is a great move by RBI. Maintaining rates shows confidence in the economy while keeping inflation in check. I expect banking stocks to remain stable.",
    timestamp: "15m ago",
    likes: 24,
    replies: 5,
  },
  {
    id: "2",
    user: { name: "Priya Patel", avatar: "PP" },
    content: "Anyone else thinks this will affect home loan rates? Been waiting to refinance my mortgage.",
    timestamp: "32m ago",
    likes: 18,
    replies: 12,
  },
  {
    id: "3",
    user: { name: "Amit Kumar", avatar: "AK", badge: "Analyst" },
    content: "The neutral stance is key here. It gives RBI flexibility to cut rates if global conditions worsen. Keep an eye on Fed decisions next week.",
    timestamp: "1h ago",
    likes: 45,
    replies: 8,
  },
]

const AI_RESPONSES: Record<string, string> = {
  "default": "Based on the article, the RBI has maintained its repo rate at 6.50% with a neutral stance. This indicates the central bank is balancing inflation control with economic growth support. Would you like me to explain any specific aspect in more detail?",
  "stocks": "Given the neutral stance, banking stocks like HDFC Bank, ICICI Bank, and SBI are likely to remain stable. Rate-sensitive sectors like real estate and auto may see moderate activity. IT stocks could benefit from the stable macro environment.",
  "impact": "The immediate impact is neutral for markets. However, the decision signals that RBI is monitoring global developments closely. If US Fed cuts rates, RBI may follow suit, which would be positive for equity markets.",
  "invest": "For investors, I recommend: 1) Banking sector ETFs for stable returns, 2) Quality IT stocks for growth, 3) Avoid highly leveraged real estate companies. Always consider your risk tolerance and investment horizon.",
}

export function ArticleDetailScreen({ article, onBack }: ArticleDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ai-summary")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content: "Hi! I can help you understand this news article better. Ask me anything about the RBI rate decision, its impact on markets, or specific stocks.",
      timestamp: "Just now"
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [discussions, setDiscussions] = useState<Discussion[]>(INITIAL_DISCUSSIONS)
  const [discussionInput, setDiscussionInput] = useState("")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (activeTab === "ai-chat") {
      scrollToBottom()
    }
  }, [chatMessages, activeTab])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: "Just now"
    }

    setChatMessages(prev => [...prev, userMessage])
    setInputValue("")

    // Simulate AI response
    setTimeout(() => {
      const lowerInput = inputValue.toLowerCase()
      let response = AI_RESPONSES.default
      
      if (lowerInput.includes("stock") || lowerInput.includes("share")) {
        response = AI_RESPONSES.stocks
      } else if (lowerInput.includes("impact") || lowerInput.includes("effect")) {
        response = AI_RESPONSES.impact
      } else if (lowerInput.includes("invest") || lowerInput.includes("buy") || lowerInput.includes("recommend")) {
        response = AI_RESPONSES.invest
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: response,
        timestamp: "Just now"
      }
      setChatMessages(prev => [...prev, aiMessage])
    }, 1000)
  }

  const handlePostDiscussion = () => {
    if (!discussionInput.trim()) return

    const newDiscussion: Discussion = {
      id: Date.now().toString(),
      user: { name: "You", avatar: "YO" },
      content: discussionInput,
      timestamp: "Just now",
      likes: 0,
      replies: 0,
    }

    setDiscussions(prev => [newDiscussion, ...prev])
    setDiscussionInput("")
  }

  const handleLikeDiscussion = (id: string) => {
    setDiscussions(prev => prev.map(d => 
      d.id === id 
        ? { ...d, likes: d.isLiked ? d.likes - 1 : d.likes + 1, isLiked: !d.isLiked }
        : d
    ))
  }

  const tabs = [
    { id: "ai-summary" as TabType, label: "AI Summary", icon: Sparkles },
    { id: "ai-chat" as TabType, label: "Ask AI", icon: Bot },
    { id: "discussions" as TabType, label: "Discuss", icon: Users },
  ]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="rounded-full p-2 -ml-2 text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Article</h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`rounded-full p-2 transition-colors ${
              isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground"
            } hover:bg-muted`}
          >
            <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Article Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
            <span className="text-[10px] font-bold text-muted-foreground">{article.source.icon}</span>
          </div>
          <span className="text-sm text-muted-foreground">{article.source.name}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{article.timestamp}</span>
        </div>
        <h2 className="text-xl font-bold leading-tight text-foreground mb-3">
          {article.headline}
        </h2>
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-background sticky top-[57px] z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "ai-summary" && (
          <div className="px-4 py-4">
            {/* AI Explains Section */}
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground">AI Explains</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {article.content || "RBI has kept the repo rate unchanged at 6.50%. The central bank remains focused on managing inflation while supporting economic growth. This is neutral for markets in the near term."}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setActiveTab("ai-chat")}
              >
                <Bot className="h-4 w-4" />
                Ask AI
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setActiveTab("discussions")}
              >
                <MessageCircle className="h-4 w-4" />
                Discuss
              </Button>
            </div>

            {/* Key Points */}
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Key Points</h3>
              <ul className="space-y-2">
                {[
                  "Repo rate maintained at 6.50% for eighth consecutive time",
                  "GDP growth forecast revised to 7.2% for FY25",
                  "Inflation expected to moderate to 4.5% by year-end",
                  "Focus remains on durable price stability",
                ].map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Impact Analysis */}
            <div className="p-4 rounded-xl bg-muted/50 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Impact Analysis</h3>
              <div className="space-y-3">
                {[
                  { sector: "Banking Sector", impact: "Neutral" },
                  { sector: "IT Sector", impact: "Positive" },
                  { sector: "Real Estate", impact: "Neutral" },
                ].map(({ sector, impact }) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{sector}</span>
                    <Badge variant="outline" className="text-gain border-gain/30 bg-gain/10">
                      {impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Stocks */}
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Affected Stocks</h3>
              <div className="flex flex-wrap gap-2">
                {["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"].map((stock) => (
                  <Badge key={stock} variant="secondary" className="font-mono text-xs">
                    {stock}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Read Full Article */}
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Read Full Article
            </Button>

            {/* Feedback */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <button className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ThumbsUp className="h-5 w-5" />
                  </button>
                  <button className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ThumbsDown className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai-chat" && (
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                    message.type === "ai" ? "bg-primary/20" : "bg-muted"
                  }`}>
                    {message.type === "ai" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${message.type === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                      message.type === "ai" 
                        ? "bg-muted text-foreground rounded-tl-none" 
                        : "bg-primary text-primary-foreground rounded-tr-none"
                    }`}>
                      {message.content}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Questions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {[
                  "How will this affect stocks?",
                  "What should I invest in?",
                  "Explain the impact",
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => setInputValue(question)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 p-2 rounded-full bg-muted">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask anything about this news..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "discussions" && (
          <div className="flex flex-col h-full">
            {/* Discussions List */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {discussions.length} Comments
                </span>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  Most recent
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-border">
                {discussions.map((discussion) => (
                  <div key={discussion.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                        <span className="text-sm font-medium text-muted-foreground">
                          {discussion.user.avatar}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground text-sm">
                            {discussion.user.name}
                          </span>
                          {discussion.user.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {discussion.user.badge}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {discussion.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                          {discussion.content}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <button 
                            onClick={() => handleLikeDiscussion(discussion.id)}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${
                              discussion.isLiked 
                                ? "text-loss" 
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${discussion.isLiked ? "fill-current" : ""}`} />
                            {discussion.likes}
                          </button>
                          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Reply className="h-4 w-4" />
                            {discussion.replies}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discussion Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border bg-background">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-muted">
                <input
                  type="text"
                  value={discussionInput}
                  onChange={(e) => setDiscussionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePostDiscussion()}
                  placeholder="Share your thoughts..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={handlePostDiscussion}
                  disabled={!discussionInput.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
