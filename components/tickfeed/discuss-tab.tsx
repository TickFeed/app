"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Send, Heart, MessageSquare, Bot, AlertCircle, ChevronLeft, Zap } from "lucide-react"
import {
  API_BASE,
  getCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  dicebearUrl,
  getUserPublicProfile,
  followUser,
  unfollowUser,
  type CommunityPost,
  type UserSearchResult,
  type PublicUserProfile,
} from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PollDisplay } from "@/components/tickfeed/screens/community-screen"

function calcAlphaScore(posts: number, likes: number, followers: number) {
  return posts * 15 + likes * 8 + followers * 25
}
const ALPHA_TIERS = [
  { min: 3000, label: "Market Maven",  color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30"  },
  { min: 1500, label: "Shark",         color: "text-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  { min: 700,  label: "Strategist",    color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30"   },
  { min: 300,  label: "Bull",          color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30"},
  { min: 100,  label: "Analyst",       color: "text-primary",     bg: "bg-primary/10",     border: "border-primary/30"    },
  { min: 1,    label: "Observer",      color: "text-foreground",  bg: "bg-muted",          border: "border-border"        },
  { min: 0,    label: "Lurker",        color: "text-muted-foreground", bg: "bg-muted",     border: "border-border"        },
]
function alphaTier(score: number) {
  return ALPHA_TIERS.find((t) => score >= t.min) ?? ALPHA_TIERS[ALPHA_TIERS.length - 1]
}

interface DiscussTabProps {
  token: string
  newsId?: number        // for article-specific discuss
  symbol?: string        // for stock-specific discuss
  contextLabel?: string
  isActive: boolean
  onCountChange?: (count: number) => void
}

function getMyUserId(token: string): number | null {
  try {
    const sub = JSON.parse(atob(token.split(".")[1])).sub
    const id = Number(sub)
    return isNaN(id) ? null : id
  } catch {
    return null
  }
}

export function DiscussTab({ token, newsId, symbol, isActive, onCountChange }: DiscussTabProps) {
  const myUserId = getMyUserId(token)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(false)
  const [profileUser, setProfileUser] = useState<PublicUserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const [postInput, setPostInput] = useState("")
  const [posting, setPosting] = useState(false)
  const [validationError, setValidationError] = useState("")
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // @mention autocomplete
  const [mentionResults, setMentionResults] = useState<UserSearchResult[]>([])
  const [showMentions, setShowMentions] = useState(false)

  // Fetch posts on mount — always, so count is available before the tab is opened
  useEffect(() => {
    setLoading(true)
    getCommunityPosts(token, "trending", 1, newsId, symbol)
      .then((data) => {
        setPosts(data)
        if (isActive) setTimeout(() => scrollToBottom("instant"), 50)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SSE: receive real-time post updates for this thread
  useEffect(() => {
    if (!symbol && newsId === undefined) return
    const param = symbol ? `symbol=${symbol}` : `news_id=${newsId}`
    const url = `${API_BASE}/api/community/posts/stream?${param}&token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    es.onmessage = () => {
      getCommunityPosts(token, "trending", 1, newsId, symbol)
        .then((data) => {
          setPosts(data)
          setTimeout(() => scrollToBottom(), 50)
        })
        .catch(() => {})
    }
    es.onerror = () => es.close()
    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to latest when user navigates to this tab
  useEffect(() => {
    if (isActive) setTimeout(() => scrollToBottom("smooth"), 80)
  }, [isActive])

  // Emit top-level post count to parent whenever posts change
  useEffect(() => {
    const count = posts.filter(p => !p.reply_to_id).length
    onCountChange?.(count)
  }, [posts, onCountChange])

  // @mention input handler — suggests tickr bot + users who posted in this thread
  const handleInputChange = useCallback((val: string) => {
    setPostInput(val)
    if (validationTimer.current) clearTimeout(validationTimer.current)
    setValidationError("")
    const at = val.lastIndexOf("@")
    if (at !== -1) {
      const after = val.slice(at + 1)
      if (/^\w*$/.test(after)) {
        setShowMentions(true)
        const query = after.toLowerCase()
        const seen = new Set<string>()
        const suggestions: UserSearchResult[] = []
        // Always offer tickr bot if it matches the query
        if (!query || "tickr".startsWith(query)) {
          suggestions.push({ id: 0, username: "tickr", first_name: "Tickr", last_name: "AI", is_bot: true, avatar_style: null, followers_count: 0, posts_count: 0 })
          seen.add("tickr")
        }
        // Add unique authors from the current thread (exclude self)
        for (const p of posts) {
          const uname = p.username
          if (!uname || seen.has(uname.toLowerCase())) continue
          if (myUserId !== null && p.author_id === myUserId) continue
          if (!query || uname.toLowerCase().startsWith(query)) {
            seen.add(uname.toLowerCase())
            suggestions.push({ id: p.author_id, username: uname, first_name: p.first_name ?? "", last_name: p.last_name ?? "", is_bot: false, avatar_style: p.avatar_style, followers_count: 0, posts_count: 0 })
          }
        }
        setMentionResults(suggestions)
        return
      }
    }
    setShowMentions(false)
  }, [posts, myUserId])

  // Known usernames in this thread (for green highlighting)
  const threadUsernames = useMemo(() => {
    const s = new Set<string>(["tickr"])
    for (const p of posts) {
      if (p.username) s.add(p.username.toLowerCase())
    }
    return s
  }, [posts])

  // Posts: highlight only real thread participants
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) =>
      part.startsWith("@") && threadUsernames.has(part.slice(1).toLowerCase())
        ? <span key={i} className="font-semibold text-green-500">{part}</span>
        : <span key={i}>{part}</span>
    )
  }

  // Input backdrop: color-only highlight so text width matches the input exactly
  const renderInputHighlight = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) =>
      part.startsWith("@") && threadUsernames.has(part.slice(1).toLowerCase())
        ? <span key={i} className="text-green-500">{part}</span>
        : <span key={i} className="text-foreground">{part}</span>
    )
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
    if (inputRef.current) inputRef.current.style.height = "auto"
    setPosting(true)
    try {
      // Article discuss posts only carry newsId; stock posts carry symbol
      const newPost = await createPost(token, content, newsId ? undefined : symbol, newsId)
      // Optimistic: show immediately (backend now returns full user fields)
      setPosts((prev) => [...prev, newPost])
      setTimeout(() => scrollToBottom(), 50)
      // Background refetch: fills any posts added since the initial mount
      getCommunityPosts(token, "trending", 1, newsId, symbol)
        .then((data) => {
          setPosts(data)
          setTimeout(() => scrollToBottom(), 50)
        })
        .catch(() => {})
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const handleUserClick = useCallback(async (userId: number) => {
    setProfileLoading(true)
    try {
      const p = await getUserPublicProfile(token, userId)
      setProfileUser(p)
    } catch {}
    finally { setProfileLoading(false) }
  }, [token])

  const handleProfileFollow = async () => {
    if (!profileUser) return
    const wasFollowing = profileUser.is_following
    setProfileUser((p) => p ? { ...p, is_following: !p.is_following, followers_count: p.followers_count + (wasFollowing ? -1 : 1) } : p)
    try {
      if (wasFollowing) await unfollowUser(token, profileUser.id)
      else await followUser(token, profileUser.id)
    } catch {
      setProfileUser((p) => p ? { ...p, is_following: wasFollowing, followers_count: p.followers_count + (wasFollowing ? 1 : -1) } : p)
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
    const username = post.username || "user"
    const initials = username.slice(0, 2).toUpperCase()
    const mins = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 60000)
    const timeAgo = mins < 1 ? "just now" : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`

    return (
      <div
        className="mx-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm"
      >
        <div className="flex gap-3">
          <Avatar
            className={`h-9 w-9 flex-shrink-0 ${!post.is_bot ? "cursor-pointer" : ""}`}
            onClick={(e) => { if (post.is_bot) return; e.stopPropagation(); handleUserClick(post.author_id) }}
          >
            {post.avatar_style && post.username && (
              <AvatarImage src={dicebearUrl(post.avatar_style, post.username)} alt={initials} />
            )}
            <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
              {post.is_bot ? <Bot className="h-4 w-4" /> : initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">@{username}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo}</span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
            {post.image_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-border/40">
                <img src={post.image_url} alt="Post image" className="w-full max-h-60 object-cover" loading="lazy" />
              </div>
            )}
            {post.poll_options && post.poll_options.length >= 2 && (
              <PollDisplay
                post={post}
                token={token}
                onVoted={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
              />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(post) }}
              className={`mt-3 flex items-center gap-1.5 text-xs transition-colors ${post.liked_by_me ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
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
      <div className="ml-8 mr-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5 shadow-sm">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">@tickr</span>
              <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">AI</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo}</span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Posts list */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto py-3 pb-4">
        {loading ? (
          <div className="space-y-3 px-3 pt-1">
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
            <div className="space-y-3">
              {topLevel.map((post) => (
                <div key={post.id} className="space-y-1.5">
                  {renderPost(post)}
                  {botReplies(post.id).map((reply) => (
                    <div key={reply.id}>{renderBotReply(reply)}</div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-border bg-background relative">
        {/* Validation toast — red left-border style */}
        {validationError && (
          <div className="absolute bottom-full left-4 right-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive border-l-4 border-destructive/70 text-destructive-foreground text-xs font-medium shadow-sm">
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
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-end gap-2 p-1.5 rounded-2xl bg-muted border border-border">
            {/* Auto-growing textarea with @mention overlay */}
            <div className="relative flex-1">
              <div
                aria-hidden="true"
                className="absolute inset-0 px-3 py-2 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words leading-5"
              >
                {postInput ? renderInputHighlight(postInput) : null}
              </div>
              <textarea
                ref={inputRef}
                rows={1}
                value={postInput}
                onChange={(e) => {
                  handleInputChange(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handlePostSubmit())}
                onBlur={() => setTimeout(() => setShowMentions(false), 150)}
                placeholder={symbol ? `Share your take on ${symbol}…` : "Share your take on this…"}
                disabled={posting}
                className={`relative w-full bg-transparent px-3 py-2 text-sm outline-none resize-none overflow-hidden leading-5 placeholder:text-muted-foreground disabled:opacity-60 caret-foreground ${postInput ? "text-transparent" : ""}`}
              />
            </div>
            <button
              onClick={handlePostSubmit}
              disabled={!postInput.trim() || posting}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:opacity-90 mb-0.5"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── User profile overlay ── */}
      {(profileUser || profileLoading) && (
        <div className="fixed inset-0 z-[400] flex flex-col bg-background">
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background safe-area-pt">
            <button
              onClick={() => setProfileUser(null)}
              className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="font-bold text-base text-foreground">Profile</h2>
          </div>

          {profileLoading && !profileUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            </div>
          ) : profileUser ? (() => {
            const pName = [profileUser.first_name, profileUser.last_name].filter(Boolean).join(" ") || profileUser.username || "User"
            const pInitials = profileUser.first_name
              ? (profileUser.first_name[0] + (profileUser.last_name?.[0] ?? "")).toUpperCase()
              : (profileUser.username ?? "?").slice(0, 2).toUpperCase()
            const avatarSrc = dicebearUrl(profileUser.avatar_style, profileUser.username ?? "")
            const score = calcAlphaScore(profileUser.posts_count, profileUser.likes_received, profileUser.followers_count)
            const tier = alphaTier(score)
            const isOwnProfile = profileUser.id === myUserId
            return (
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center pt-10 pb-6 px-6 text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={pInitials} />}
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{pInitials}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-black text-foreground">{pName}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">@{profileUser.username ?? "user"}</p>
                  {!isOwnProfile && (
                    <button
                      onClick={handleProfileFollow}
                      className={`mt-4 rounded-full border px-6 py-2 text-sm font-bold transition-colors ${
                        profileUser.is_following
                          ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                          : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {profileUser.is_following ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
                <div className={`mx-4 mb-4 rounded-2xl border p-4 ${tier.bg} ${tier.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${tier.color}`} />
                      <span className={`text-sm font-bold ${tier.color}`}>{tier.label}</span>
                    </div>
                    <span className={`text-lg font-black ${tier.color}`}>{score.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Alpha Score</p>
                </div>
                <div className="mx-4 grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Posts",     value: profileUser.posts_count },
                    { label: "Followers", value: profileUser.followers_count },
                    { label: "Following", value: profileUser.following_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl bg-muted/50 border border-border/50 p-3 text-center">
                      <p className="text-lg font-black text-foreground">{value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })() : null}
        </div>
      )}
    </div>
  )
}
