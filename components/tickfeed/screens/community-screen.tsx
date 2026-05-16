"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, TrendingUp, MessageSquare, Send, Heart } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  getCommunityPosts,
  createPost,
  likePost,
  unlikePost,
  getTrendingTopics,
  formatRelativeTime,
  type CommunityPost,
  type TrendingTopic,
} from "@/lib/api"

const TABS = [
  { label: "Trending", tab: "trending" as const },
  { label: "Following", tab: "following" as const },
  { label: "My Posts", tab: "mine" as const },
]

function authorInitials(post: CommunityPost): string {
  if (post.first_name) return (post.first_name[0] + (post.last_name?.[0] ?? "")).toUpperCase()
  if (post.username) return post.username.slice(0, 2).toUpperCase()
  return "??"
}

function authorName(post: CommunityPost): string {
  if (post.first_name) {
    return [post.first_name, post.last_name].filter(Boolean).join(" ")
  }
  return post.username ?? "Anonymous"
}

interface CommunityScreenProps {
  token: string
}

export function CommunityScreen({ token }: CommunityScreenProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newPost, setNewPost] = useState("")
  const [posting, setPosting] = useState(false)

  const fetchPosts = useCallback(async (tabIdx: number) => {
    setLoading(true)
    setError("")
    try {
      const result = await getCommunityPosts(token, TABS[tabIdx].tab)
      setPosts(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchTopics = useCallback(async () => {
    try {
      const result = await getTrendingTopics(token)
      setTopics(result)
    } catch {
      // non-critical
    }
  }, [token])

  useEffect(() => {
    fetchPosts(activeTab)
    fetchTopics()
  }, [activeTab, fetchPosts, fetchTopics])

  const handleLike = async (post: CommunityPost) => {
    const fn = post.liked_by_me ? unlikePost : likePost
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p,
      ),
    )
    try {
      const res = await fn(token, post.id)
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes_count: res.likes_count, liked_by_me: res.liked } : p)),
      )
    } catch {
      // revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count }
            : p,
        ),
      )
    }
  }

  const handlePost = async () => {
    if (!newPost.trim() || posting) return
    setPosting(true)
    try {
      const created = await createPost(token, newPost.trim())
      setPosts((prev) => [created, ...prev])
      setNewPost("")
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="px-4 pb-2 pt-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">Community</h1>
        <p className="text-sm text-muted-foreground">Discuss market trends with investors</p>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search discussions..."
            className="w-full rounded-full bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border px-4">
        {TABS.map((t, i) => (
          <button
            key={t.tab}
            onClick={() => setActiveTab(i)}
            className={`relative py-3 text-sm font-medium transition-colors ${
              activeTab === i ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {activeTab === i && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Trending Topics */}
      {topics.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Trending Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 6).map((t) => (
              <Badge key={t.topic} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                #{t.topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-3 w-28 rounded bg-muted mb-2" />
                    <div className="h-4 w-full rounded bg-muted mb-1" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-muted-foreground">{error}</p>
            <button onClick={() => fetchPosts(activeTab)} className="mt-3 text-sm text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Be the first to share your insights</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border-b border-border/50 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {authorInitials(post)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{authorName(post)}</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(post.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground leading-relaxed">{post.content}</p>
                  {post.symbol && (
                    <div className="mt-2">
                      <span className="text-xs text-primary hover:underline cursor-pointer">
                        #{post.symbol}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-6">
                    <button
                      onClick={() => handleLike(post)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.liked_by_me ? "text-loss" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                      <span className="text-xs">{post.likes_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Post Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted">
          <input
            type="text"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePost()}
            placeholder="Share your market insights..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
