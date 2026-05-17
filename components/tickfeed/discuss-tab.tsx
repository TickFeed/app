"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Heart, MessageSquare, Bot, AlertCircle } from "lucide-react"
import {
  getCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  searchUsers,
  type CommunityPost,
  type UserSearchResult,
} from "@/lib/api"

interface DiscussTabProps {
  token: string
  newsId?: number        // for article-specific discuss
  symbol?: string        // for stock-specific discuss
  contextLabel?: string
  isActive: boolean
}

export function DiscussTab({ token, newsId, symbol, isActive }: DiscussTabProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  const [postInput, setPostInput] = useState("")
  const [posting, setPosting] = useState(false)
  const [validationError, setValidationError] = useState("")
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // @mention autocomplete
  const [mentionResults, setMentionResults] = useState<UserSearchResult[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch posts on first activation
  useEffect(() => {
    if (!isActive || fetched.current) return
    fetched.current = true
    setLoading(true)
    getCommunityPosts(token, "trending", 1, newsId, symbol)
      .then((data) => {
        setPosts(data)
        // scroll to bottom after load
        setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "instant" }), 50)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isActive, token, newsId, symbol])

  // @mention input handler
  const handleInputChange = useCallback((val: string) => {
    setPostInput(val)
    if (validationTimer.current) clearTimeout(validationTimer.current)
    setValidationError("")
    const at = val.lastIndexOf("@")
    if (at !== -1) {
      const after = val.slice(at + 1)
      if (/^\w*$/.test(after)) {
        setShowMentions(true)
        if (mentionTimer.current) clearTimeout(mentionTimer.current)
        mentionTimer.current = setTimeout(() => {
          searchUsers(token, after)
            .then(setMentionResults)
            .catch(() => setMentionResults([]))
        }, 200)
        return
      }
    }
    setShowMentions(false)
  }, [token])

  // Highlight @mentions inline
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (!part.startsWith("@")) return part
      const isTickr = part.toLowerCase() === "@tickr"
      return (
        <span key={i} className={isTickr ? "font-semibold text-green-500" : "font-medium text-primary"}>
          {part}
        </span>
      )
    })
  }

  const insertMention = (username: string) => {
    const at = postInput.lastIndexOf("@")
    const newVal = postInput.slice(0, at) + `@${username} `
    setPostInput(newVal)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const showError = (msg: string) => {
    if (validationTimer.current) clearTimeout(validationTimer.current)
    setValidationError(msg)
    validationTimer.current = setTimeout(() => setValidationError(""), 2000)
  }

  const handlePostSubmit = async () => {
    if (!postInput.trim() || posting) return
    const content = postInput.trim()

    // Require context when tagging @tickr
    const hasTickr = content.toLowerCase().includes("@tickr")
    const contextOnly = content.replace(/@\w+/g, "").trim()
    if (hasTickr && contextOnly.length < 10) {
      showError("Add some context for @tickr to answer")
      return
    }

    setPostInput("")
    setShowMentions(false)
    setPosting(true)
    try {
      // Article discuss posts only carry newsId; stock posts carry symbol
      const newPost = await createPost(token, content, newsId ? undefined : symbol, newsId)
      // Append at bottom (posts are oldest-first)
      setPosts((prev) => [...prev, newPost])
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      // If @tickr was mentioned, re-fetch after 4.5s to pick up bot reply
      if (hasTickr) {
        setTimeout(() => {
          getCommunityPosts(token, "trending", 1, newsId, symbol)
            .then((data) => {
              setPosts(data)
              setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
            })
            .catch(() => {})
        }, 4500)
      }
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (post: CommunityPost) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    )
    try {
      if (post.liked_by_me) await unlikePost(token, post.id)
      else await likePost(token, post.id)
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : p
        )
      )
    }
  }

  const topLevel = posts.filter((p) => !p.reply_to_id)
  const botReplies = (parentId: number) => posts.filter((p) => p.reply_to_id === parentId)

  const renderPost = (post: CommunityPost) => {
    const name = [post.first_name, post.last_name].filter(Boolean).join(" ") || post.username || "User"
    const initials = name.slice(0, 2).toUpperCase()
    const mins = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 60000)
    const timeAgo = mins < 1 ? "just now" : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`

    return (
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold bg-primary/20 text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
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
  }

  const renderBotReply = (post: CommunityPost) => {
    const mins = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 60000)
    const timeAgo = mins < 1 ? "just now" : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`

    return (
      <div className="border-b border-border/50 bg-primary/5">
        <div className="ml-10 border-l-2 border-primary/30 px-4 py-3">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">Tickr AI</span>
                <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>
                <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Posts list */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-2">
        {loading ? (
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
        ) : topLevel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground text-sm">Start the conversation</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Tag @tickr to get AI analysis</p>
          </div>
        ) : (
          <>
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {topLevel.length} {topLevel.length === 1 ? "post" : "posts"}
            </p>
            {topLevel.map((post) => (
              <div key={post.id}>
                {renderPost(post)}
                {botReplies(post.id).map((reply) => (
                  <div key={reply.id}>{renderBotReply(reply)}</div>
                ))}
              </div>
            ))}
          </>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-border bg-background relative">
        {/* Validation toast — red left-border style */}
        {validationError && (
          <div className="absolute bottom-full left-4 right-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border-l-4 border-destructive text-destructive text-xs font-medium shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {validationError}
          </div>
        )}
        {/* @mention dropdown */}
        {showMentions && mentionResults.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl border border-border bg-background shadow-lg z-20 overflow-hidden">
            {mentionResults.map((u) => (
              <button
                key={u.username}
                onMouseDown={(e) => { e.preventDefault(); insertMention(u.username) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.is_bot ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                  {u.is_bot ? <Bot className="h-3.5 w-3.5" /> : u.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">@{u.username}</p>
                  {u.is_bot && <p className="text-[10px] text-muted-foreground">AI Market Analyst</p>}
                </div>
                {u.is_bot && <span className="ml-auto text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center px-4 py-2">
          <input
            ref={inputRef}
            value={postInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handlePostSubmit())}
            onBlur={() => setTimeout(() => setShowMentions(false), 150)}
            placeholder={symbol ? `Share your take on ${symbol}…` : "Share your take on this…"}
            className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handlePostSubmit}
            disabled={!postInput.trim() || posting}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
