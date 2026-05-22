"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ExternalLink,
  Send,
  Bot,
  MessageSquare,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { NewsArticle } from "@/app/page"
import {
  getArticleSummary,
  getChatHistory,
  API_BASE,
  type ArticleSummary,
} from "@/lib/api"
import { DiscussTab } from "@/components/tickfeed/discuss-tab"
import { toast } from "@/hooks/use-toast"
import { AiMarkdown } from "@/components/tickfeed/ai-markdown"

interface ArticleDetailScreenProps {
  token: string
  article: NewsArticle
  onBack?: () => void
  initialTab?: "ai-summary" | "ai-chat" | "discussions"
}

type TabType = "ai-summary" | "ai-chat" | "discussions"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  events?: string[]
}

export function ArticleDetailScreen({ token, article, onBack, initialTab }: ArticleDetailScreenProps) {
  const numericId = parseInt(article.id, 10)

  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? "ai-summary")
  const [discussCount, setDiscussCount] = useState<number | null>(null)

  // AI summary state
  const [summary, setSummary] = useState<ArticleSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")
  const summaryFetched = useRef(false)

  // Chat state
  const INIT_MESSAGE: ChatMessage = {
    id: "init",
    role: "assistant",
    content: "Hi! Ask me anything about this article or Indian markets — implications, technical analysis, stock data, and more.",
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INIT_MESSAGE])
  const [inputValue, setInputValue] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatHistoryLoaded, setChatHistoryLoaded] = useState(false)
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch summary when AI Summary tab is first shown
  const fetchSummary = useCallback(async () => {
    if (summaryFetched.current || isNaN(numericId)) return
    summaryFetched.current = true
    setSummaryLoading(true)
    setSummaryError("")
    try {
      const s = await getArticleSummary(token, numericId)
      setSummary(s)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load summary")
      summaryFetched.current = false
    } finally {
      setSummaryLoading(false)
    }
  }, [token, numericId])

  useEffect(() => {
    if (activeTab === "ai-summary") fetchSummary()
  }, [activeTab, fetchSummary])

  // Load persisted chat history once when the ai-chat tab is first activated
  useEffect(() => {
    if (activeTab !== "ai-chat" || chatHistoryLoaded || isNaN(numericId)) return
    setChatHistoryLoaded(true)
    setChatHistoryLoading(true)
    getChatHistory(token, numericId)
      .then((history) => {
        if (history.length > 0) {
          const restored: ChatMessage[] = history.map((m, i) => ({
            id: `history-${i}`,
            role: m.role,
            content: m.content,
          }))
          setChatMessages([INIT_MESSAGE, ...restored])
        }
      })
      .catch(() => {})
      .finally(() => setChatHistoryLoading(false))
  }, [activeTab, chatHistoryLoaded, numericId, token])

  useEffect(() => {
    if (activeTab === "ai-chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, activeTab])

  const sendMessage = useCallback(async (content: string, currentMessages: ChatMessage[]) => {
    if (!content.trim() || chatLoading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content }
    const aiMsgId = (Date.now() + 1).toString()
    const aiMsg: ChatMessage = { id: aiMsgId, role: "assistant", content: "", events: [] }
    const history = [...currentMessages, userMsg].map((m) => ({ role: m.role, content: m.content }))

    setChatMessages((prev) => [...prev, userMsg, aiMsg])
    setChatLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/news/${numericId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) throw new Error("failed")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split("\n\n")
          buffer = parts.pop() || ""
          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed.startsWith("data: ")) continue
            try {
              const data = JSON.parse(trimmed.slice(6))
              if (data.type === "chunk")
                setChatMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: m.content + data.content } : m))
              else if (data.type === "event")
                setChatMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, events: [...(m.events ?? []), JSON.stringify({ kind: data.kind ?? "tool", content: data.content })] } : m))
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setChatMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m))
    } finally {
      setChatLoading(false)
    }
  }, [chatLoading, numericId, token])

  const sendQuestion = useCallback((q: string) => sendMessage(q, chatMessages), [sendMessage, chatMessages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatLoading) return
    const content = inputValue.trim()
    setInputValue("")
    await sendMessage(content, chatMessages)
  }

  const tabs = [
    { id: "ai-summary" as TabType, label: "AI Summary", icon: Sparkles, count: null },
    { id: "ai-chat" as TabType, label: "Ask AI", icon: Bot, count: null },
    { id: "discussions" as TabType, label: "Discuss", icon: MessageSquare, count: discussCount },
  ]

  const handleShare = async () => {
    const appUrl = `${window.location.origin}/?article=${numericId}`
    const title  = article.headline
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: appUrl })
      } catch {
        // user cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(appUrl)
        toast({ title: "Link copied", description: "Article link copied to clipboard." })
      } catch {
        toast({ title: "Share", description: appUrl })
      }
    }
  }

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
        <button
          onClick={handleShare}
          className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </header>

      {/* Article meta */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        {/* Source + timestamp */}
        <div className="flex items-center gap-1.5 mb-2.5">
          {article.source.icon && (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-muted flex-shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground">{article.source.icon}</span>
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground">{article.source.name}</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground">{article.timestamp}</span>
        </div>

        {/* Headline + thumbnail side by side */}
        <div className="flex gap-3 mb-3">
          <h2 className="flex-1 text-[17px] font-bold leading-snug text-foreground">
            {article.headline}
          </h2>
          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted self-start">
            <img
              src={article.imageUrl || (article.source.name.toLowerCase().includes("nse") ? "/default-nse.svg" : "/default-news.svg")}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement
                const fallback = article.source.name.toLowerCase().includes("nse") ? "/default-nse.svg" : "/default-news.svg"
                if (img.src !== window.location.origin + fallback) img.src = fallback
              }}
            />
          </div>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-background sticky top-[57px] z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content — ai-summary scrolls externally; discuss/ai-chat manage their own scroll */}
      {activeTab === "ai-summary" && (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
            {summaryLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="rounded-xl bg-muted h-32" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : summaryError ? (
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">{summaryError}</p>
                <button
                  onClick={() => { summaryFetched.current = false; fetchSummary() }}
                  className="text-sm text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : summary ? (
              <>
                {/* AI Explains */}
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">AI Explains</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ml-auto ${
                      summary.sentiment?.toLowerCase() === "bullish"
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                        : summary.sentiment?.toLowerCase() === "bearish"
                        ? "border-red-500/40 text-red-500 bg-red-500/10"
                        : "border-border text-muted-foreground bg-muted"
                    }`}>
                      {summary.sentiment}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{summary.summary}</p>
                </div>

                {/* Impact */}
                {summary.impact && (() => {
                  const raw = summary.impact.trim()
                  // Split on newlines; if only one chunk, split on ". " instead
                  let bullets = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
                  if (bullets.length === 1) {
                    bullets = raw.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
                      .map((s, i, arr) => i < arr.length - 1 ? s + "." : s)
                  }
                  return (
                    <div className="p-4 rounded-xl bg-muted/50 mb-4">
                      <h3 className="font-semibold text-foreground mb-3 text-sm">Impact</h3>
                      <ul className="space-y-2">
                        {bullets.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            <span className="text-sm text-muted-foreground leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}

                {/* What to watch */}
                {summary.action_hint && (() => {
                  const raw = summary.action_hint.trim()
                  let bullets = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
                  if (bullets.length === 1) {
                    bullets = raw.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
                      .map((s, i, arr) => i < arr.length - 1 ? s + "." : s)
                  }
                  return (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                      <h3 className="font-semibold text-foreground mb-3 text-sm">What to watch</h3>
                      <ul className="space-y-2">
                        {bullets.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                            <span className="text-sm text-foreground/80 leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}

                {/* Key Stocks */}
                {summary.key_stocks?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground mb-3 text-sm">Affected Stocks</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.key_stocks.map((s) => (
                        <Badge key={s} variant="secondary" className="font-mono text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

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
                  {article.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => window.open(article.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Read Original
                    </Button>
                  )}
                </div>

                {/* Disclaimer */}
                {summary.disclaimer && (
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed border-t border-border pt-3">
                    {summary.disclaimer}
                  </p>
                )}

                {/* Feedback */}
                <div className="mt-4 pt-4 border-t border-border">
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
              </>
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">AI Explains</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {article.content || "Summary not available for this article."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === "discussions" ? "" : "hidden"}`}>
        <DiscussTab
          token={token}
          newsId={numericId}
          isActive={activeTab === "discussions"}
          onCountChange={setDiscussCount}
        />
      </div>

      {activeTab === "ai-chat" && (
        <div className="flex-1 flex flex-col min-h-0">
            {chatHistoryLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <svg className="h-7 w-7 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs text-muted-foreground">Fetching your chat…</span>
              </div>
            ) : null}
            <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 ${chatHistoryLoading ? "hidden" : ""}`}>

              {/* Welcome state */}
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center pt-4 pb-2">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-lg">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <p className="font-semibold text-foreground text-base">Ask the AI Analyst</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center px-6">
                    Instant insights on this article — impact, stocks to watch, what it means for you.
                  </p>
                  <div className="w-full mt-5 space-y-2">
                    {[
                      { q: "How will this affect the market?", icon: "📈" },
                      { q: "Which stocks should I watch?", icon: "👀" },
                      { q: "Explain this in simple terms", icon: "💡" },
                      { q: "Is this bullish or bearish?", icon: "🎯" },
                    ].map(({ q, icon }) => (
                      <button
                        key={q}
                        onClick={() => sendQuestion(q)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/70 border border-border/50 text-left transition-colors"
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm text-foreground">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((message, idx) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    /* User bubble — right aligned */
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    /* AI message — full width, card style */
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-primary mb-1.5 uppercase tracking-wide">AI Analyst</p>
                        {!message.content && chatLoading && idx === chatMessages.length - 1 ? (
                          message.events && message.events.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {message.events.map((ev, i) => {
                                let content = ev
                                try { content = JSON.parse(ev).content } catch {}
                                return (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                                    {content}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <ThinkingStatus />
                          )
                        ) : (
                          <AiMarkdown content={message.content} streaming={chatLoading && idx === chatMessages.length - 1} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested chips — shown after first exchange */}
            {chatMessages.length > 0 && !chatLoading && (
              <div className="px-4 pb-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {["What's the risk?", "Explain simpler", "What next?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInputValue(q)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="px-4 pb-4">
              <div className="flex items-end gap-2 p-1.5 rounded-2xl bg-muted border border-border">
                <textarea
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder="Ask anything about this news…"
                  disabled={chatLoading}
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none resize-none overflow-hidden leading-5 placeholder:text-muted-foreground disabled:opacity-60"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || chatLoading}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:opacity-90 mb-0.5"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

// ── Thinking status with cycling phrases ─────────────────────────────────────

const THINKING_PHRASES = [
  "Analyzing article…",
  "Thinking through the data…",
  "Checking market context…",
  "Forming a view…",
  "Reading between the lines…",
  "Connecting the dots…",
  "Almost there…",
]

function ThinkingStatus() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % THINKING_PHRASES.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse flex-shrink-0" />
      <span key={idx} className="text-xs text-muted-foreground transition-opacity duration-300">
        {THINKING_PHRASES[idx]}
      </span>
    </div>
  )
}
