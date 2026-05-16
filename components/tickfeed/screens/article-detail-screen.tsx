"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  MoreVertical,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ExternalLink,
  Send,
  Bot,
  User,
  MessageSquare,
  Heart,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { NewsArticle } from "@/app/page"
import {
  getArticleDetail,
  getArticleSummary,
  chatAboutArticle,
  toggleBookmark,
  getCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  type ArticleSummary,
  type CommunityPost,
} from "@/lib/api"

interface ArticleDetailScreenProps {
  token: string
  article: NewsArticle
  onBack?: () => void
}

type TabType = "ai-summary" | "ai-chat" | "discussions"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ArticleDetailScreen({ token, article, onBack }: ArticleDetailScreenProps) {
  const numericId = parseInt(article.id, 10)

  const [activeTab, setActiveTab] = useState<TabType>("ai-summary")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [togglingBookmark, setTogglingBookmark] = useState(false)

  // AI summary state
  const [summary, setSummary] = useState<ArticleSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState("")
  const summaryFetched = useRef(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hi! Ask me anything about this article — its implications, affected stocks, or what it means for your investments.",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Discussions state
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const postsFetched = useRef(false)
  const [postInput, setPostInput] = useState("")
  const [posting, setPosting] = useState(false)

  // Fetch article detail for bookmarked status
  useEffect(() => {
    if (isNaN(numericId)) return
    getArticleDetail(token, numericId)
      .then((detail) => setIsBookmarked(detail.bookmarked))
      .catch(() => {})
  }, [token, numericId])

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

  const fetchPosts = useCallback(async () => {
    if (postsFetched.current) return
    postsFetched.current = true
    setPostsLoading(true)
    try {
      const data = await getCommunityPosts(token, "trending")
      setPosts(data)
    } catch {
      // non-critical
    } finally {
      setPostsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === "discussions") fetchPosts()
  }, [activeTab, fetchPosts])

  const handlePostSubmit = async () => {
    if (!postInput.trim() || posting) return
    const content = postInput.trim()
    setPostInput("")
    setPosting(true)
    try {
      const symbol = article.tags[0] ?? null
      const newPost = await createPost(token, content, symbol ?? undefined)
      setPosts((prev) => [newPost, ...prev])
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (post: CommunityPost) => {
    const optimistic = posts.map((p) =>
      p.id === post.id
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    )
    setPosts(optimistic)
    try {
      if (post.liked_by_me) await unlikePost(token, post.id)
      else await likePost(token, post.id)
    } catch {
      setPosts(posts) // revert
    }
  }

  useEffect(() => {
    if (activeTab === "ai-chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, activeTab])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatLoading) return
    const content = inputValue.trim()
    setInputValue("")

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content }
    setChatMessages((prev) => [...prev, userMsg])
    setChatLoading(true)

    try {
      const history = [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content }))
      const res = await chatAboutArticle(token, numericId, history)
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
      }
      setChatMessages((prev) => [...prev, aiMsg])
    } catch (e) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: e instanceof Error ? e.message : "Sorry, something went wrong. Try again.",
      }
      setChatMessages((prev) => [...prev, errMsg])
    } finally {
      setChatLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (togglingBookmark || isNaN(numericId)) return
    setTogglingBookmark(true)
    try {
      const res = await toggleBookmark(token, numericId)
      setIsBookmarked(res.bookmarked)
    } catch {
      // ignore
    } finally {
      setTogglingBookmark(false)
    }
  }

  const tabs = [
    { id: "ai-summary" as TabType, label: "AI Summary", icon: Sparkles, count: null },
    { id: "ai-chat" as TabType, label: "Ask AI", icon: Bot, count: null },
    { id: "discussions" as TabType, label: "Discuss", icon: MessageSquare, count: posts.length > 0 ? posts.length : null },
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
            onClick={handleBookmark}
            disabled={togglingBookmark}
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
        <h2 className="text-xl font-bold leading-tight text-foreground mb-3">{article.headline}</h2>
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count != null && (
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "ai-summary" && (
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
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {summary.sentiment}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{summary.summary}</p>
                </div>

                {/* Impact */}
                {summary.impact && (
                  <div className="p-4 rounded-xl bg-muted/50 mb-4">
                    <h3 className="font-semibold text-foreground mb-2 text-sm">Impact</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{summary.impact}</p>
                  </div>
                )}

                {/* Action Hint */}
                {summary.action_hint && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                    <h3 className="font-semibold text-foreground mb-2 text-sm">What to watch</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{summary.action_hint}</p>
                  </div>
                )}

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
        )}

        {activeTab === "discussions" && (
          <div className="flex flex-col h-full">
            {/* Article context chip */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs text-muted-foreground line-clamp-2 italic">"{article.headline}"</p>
            </div>

            {/* Post compose */}
            <div className="px-4 pb-3 border-b border-border">
              <div className="flex gap-2 items-end">
                <textarea
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.metaKey && handlePostSubmit()}
                  placeholder="What's your take on this? How does it affect the market?"
                  rows={2}
                  className="flex-1 resize-none rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handlePostSubmit}
                  disabled={!postInput.trim() || posting}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {article.tags[0] && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Tagged as <span className="font-medium text-primary">{article.tags[0]}</span>
                </p>
              )}
            </div>

            {/* Posts list */}
            <div className="flex-1 overflow-y-auto pb-4">
              {postsLoading ? (
                <div className="space-y-4 px-4 pt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-2/3 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground text-sm">Start the conversation</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Share your perspective on this news</p>
                </div>
              ) : (
                <>
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {posts.length} {posts.length === 1 ? "comment" : "comments"}
                  </p>
                  {posts.map((post) => {
                    const name = [post.first_name, post.last_name].filter(Boolean).join(" ") || post.username || "User"
                    const initials = name.slice(0, 2).toUpperCase()
                    const mins = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 60000)
                    const timeAgo = mins < 1 ? "just now" : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`
                    return (
                      <div key={post.id} className="px-4 py-3 border-b border-border/50">
                        <div className="flex gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">{name}</span>
                              {post.symbol && (
                                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{post.symbol}</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>
                            <button
                              onClick={() => handleLike(post)}
                              className={`mt-2 flex items-center gap-1 text-xs transition-colors ${post.liked_by_me ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${post.liked_by_me ? "fill-current" : ""}`} />
                              {post.likes_count > 0 && <span>{post.likes_count}</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "ai-chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                      message.role === "assistant" ? "bg-primary/20" : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                        message.role === "assistant"
                          ? "bg-muted text-foreground rounded-tl-none"
                          : "bg-primary text-primary-foreground rounded-tr-none"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Questions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {[
                  "How will this affect stocks?",
                  "What should I watch?",
                  "Explain the impact",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInputValue(q)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    {q}
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
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask anything about this news…"
                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || chatLoading}
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
