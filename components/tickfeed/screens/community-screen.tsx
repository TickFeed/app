"use client"

import React, {
  useState, useEffect, useCallback, useRef, useMemo, Fragment,
} from "react"
import {
  Search, TrendingUp, X, Plus, Heart, MessageCircle,
  RefreshCw, Bot, Image as ImageIcon, BarChart2, ChevronLeft, Send, AlertCircle, Share2, Zap,
  MoreVertical, Trash2, Flag,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import {
  getCommunityPosts, createPost, likePost, unlikePost,
  getPostComments, searchCommunityPosts, followUser, unfollowUser,
  dicebearUrl, getUserPublicProfile, getPostById,
  requestUploadUrl, uploadToBlob, votePoll, deletePost, reportPost,
  formatRelativeTime, API_BASE,
  type CommunityPost, type PublicUserProfile,
} from "@/lib/api"
import { toast } from "@/hooks/use-toast"

// ── Helpers ────────────────────────────────────────────────────────────────

function authorInitials(post: CommunityPost) {
  if (post.first_name) return (post.first_name[0] + (post.last_name?.[0] ?? "")).toUpperCase()
  return (post.username ?? "?").slice(0, 2).toUpperCase()
}
function authorName(post: CommunityPost) {
  if (post.first_name) return [post.first_name, post.last_name].filter(Boolean).join(" ")
  return post.username ?? "Anonymous"
}
function getMyUserId(token: string): number | null {
  try {
    const id = Number(JSON.parse(atob(token.split(".")[1])).sub)
    return isNaN(id) ? null : id
  } catch { return null }
}

// Render #hashtags and @mentions as coloured spans.
// @tickr → emerald; other @mentions → bold only; #hashtags → primary colour.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\B#\w+|\B@\w+)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("#") ? (
          <span key={i} className="text-primary font-semibold">{p}</span>
        ) : /^@tickr$/i.test(p) ? (
          <span key={i} className="text-emerald-500 font-semibold">{p}</span>
        ) : p.startsWith("@") ? (
          <span key={i} className="font-semibold">{p}</span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  )
}

// ── MentionTextarea ────────────────────────────────────────────────────────
// Plain auto-growing textarea.  @tickr is highlighted in emerald via a
// mirror div rendered behind the textarea.  The textarea uses
// -webkit-text-fill-color:transparent so only the caret (caretColor) is
// visible — the mirror's coloured spans show through instead.
// All other text in the mirror inherits the normal foreground colour.

interface MentionTextareaProps {
  value: string
  onChange: (val: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  maxHeight?: number   // px, default 96
  className?: string
}

/** Split text into runs, wrapping @tickr in an emerald span. */
function highlightTickr(text: string): React.ReactNode {
  const parts = text.split(/(@tickr\b)/gi)
  return parts.map((part, i) =>
    /^@tickr$/i.test(part)
      ? <span key={i} style={{ color: "#10b981" }}>{part}</span>  // emerald-500
      : <span key={i}>{part}</span>
  )
}

function MentionTextarea({
  value, onChange, onKeyDown, placeholder, inputRef, maxHeight = 96, className = "",
}: MentionTextareaProps) {
  const mirrorRef = useRef<HTMLDivElement>(null)

  const syncHeight = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    const h = Math.min(el.scrollHeight, maxHeight)
    el.style.height = h + "px"
    if (mirrorRef.current) mirrorRef.current.style.height = h + "px"
  }

  // Keep mirror scroll in sync with textarea scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop
  }

  // Shared typographic styles (must match textarea exactly so mirror aligns)
  const sharedStyle: React.CSSProperties = {
    font: "inherit",
    fontSize: "0.875rem",   // text-sm
    lineHeight: "1.625",    // leading-relaxed
    letterSpacing: "inherit",
    padding: "0.25rem 0",   // py-1
    margin: 0,
    border: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    boxSizing: "border-box" as const,
    width: "100%",
  }

  const hasTickr = /@tickr\b/i.test(value)

  return (
    <div className="relative flex-1 w-full min-w-0">
      {/* Mirror — only rendered when @tickr is present to avoid layout cost */}
      {hasTickr && (
        <div
          ref={mirrorRef}
          aria-hidden
          style={{
            ...sharedStyle,
            position: "absolute",
            inset: 0,
            color: "hsl(var(--foreground))",
            overflow: "hidden",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {highlightTickr(value)}
          {/* trailing space keeps height stable when last char is newline */}
          {"​"}
        </div>
      )}

      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          syncHeight(e.target)
        }}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={1}
        style={hasTickr ? {
          ...sharedStyle,
          background: "transparent",
          outline: "none",
          resize: "none",
          // hide text colour so mirror shows through; caret stays visible
          WebkitTextFillColor: "transparent",
          caretColor: "hsl(var(--foreground))",
          position: "relative",
          overflow: "auto",
        } : undefined}
        className={`w-full bg-transparent outline-none resize-none text-sm leading-relaxed py-1 ${
          hasTickr ? "" : "text-foreground"
        } placeholder:text-muted-foreground ${className}`}
      />
    </div>
  )
}

// ── Poll display ──────────────────────────────────────────────────────────

export function PollDisplay({
  post, token, onVoted,
}: { post: CommunityPost; token: string; onVoted?: (updated: CommunityPost) => void }) {
  const opts = post.poll_options
  if (!opts || opts.length < 2) return null

  const total = opts.reduce((s, o) => s + o.votes, 0)
  const hasVoted = post.my_poll_vote != null
  const [voting, setVoting] = useState<number | null>(null)

  const handleVote = async (e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    if (voting !== null || !onVoted) return
    if (post.my_poll_vote === idx) return  // same option — no-op
    setVoting(idx)
    try {
      const res = await votePoll(token, post.id, idx)
      onVoted({ ...post, poll_options: res.poll_options, my_poll_vote: res.my_poll_vote })
    } catch { /* ignore */ }
    finally { setVoting(null) }
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {opts.map((opt, idx) => {
        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
        const isChosen = post.my_poll_vote === idx
        return (
          <button
            key={idx}
            onClick={(e) => handleVote(e, idx)}
            disabled={voting !== null}
            className={`relative w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors overflow-hidden ${
              isChosen ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
            }`}
          >
            {hasVoted && (
              <span
                className={`absolute inset-y-0 left-0 rounded-xl ${isChosen ? "bg-primary/10" : "bg-muted/60"}`}
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative flex items-center justify-between gap-2">
              <span className="truncate">{opt.text}</span>
              {hasVoted && (
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{pct}%</span>
              )}
            </span>
          </button>
        )
      })}
      <p className="text-[11px] text-muted-foreground pl-1">
        {total} {total === 1 ? "vote" : "votes"}{hasVoted ? " · tap to change" : ""}
      </p>
    </div>
  )
}

// ── Post action sheet (three-dot menu) ────────────────────────────────────

const REPORT_REASONS = [
  { id: "spam",          label: "Spam"                     },
  { id: "misinformation",label: "Misinformation"           },
  { id: "inappropriate", label: "Inappropriate content"    },
  { id: "harassment",    label: "Harassment or hate speech"},
  { id: "other",         label: "Other"                    },
]

function PostMenuSheet({
  isOwn, onClose, onDelete, onReport,
}: { isOwn: boolean; onClose: () => void; onDelete?: () => void; onReport?: (reason: string) => void }) {
  const [step, setStep] = useState<"main" | "reason" | "other">("main")
  const [otherText, setOtherText] = useState("")
  const otherRef = React.useRef<HTMLTextAreaElement>(null)

  const goToOther = () => {
    setStep("other")
    setTimeout(() => otherRef.current?.focus(), 80)
  }

  return (
    <div className="fixed inset-0 z-[400] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-background rounded-t-2xl px-4 pb-10 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

        {step === "main" && (
          <>
            {isOwn ? (
              <button
                onClick={() => { onDelete?.(); onClose() }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-5 w-5 shrink-0" />
                <span className="font-semibold">Delete Post</span>
              </button>
            ) : (
              <button
                onClick={() => setStep("reason")}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Flag className="h-5 w-5 shrink-0" />
                <span className="font-semibold">Report Post</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="mt-1 flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {step === "reason" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStep("main")}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-bold text-foreground">Why are you reporting this?</p>
            </div>
            <div className="space-y-0.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => r.id === "other" ? goToOther() : (onReport?.(r.id), onClose())}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                  {r.id === "other" && <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {step === "other" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStep("reason")}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-bold text-foreground">Tell us what's wrong</p>
            </div>
            <textarea
              ref={otherRef}
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Describe the issue…"
              maxLength={300}
              rows={4}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-right text-[11px] text-muted-foreground mt-1 mb-3">{otherText.length}/300</p>
            <button
              onClick={() => { if (otherText.trim()) { onReport?.(`other: ${otherText.trim()}`); onClose() } }}
              disabled={!otherText.trim()}
              className="flex w-full items-center justify-center rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              Submit Report
            </button>
            <button
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost
  myUserId: number | null
  token: string
  onLike: (post: CommunityPost) => void
  onComment: (post: CommunityPost) => void
  onFollow: (post: CommunityPost) => void
  onReply?: (post: CommunityPost) => void   // only provided inside CommentsSheet
  onVoted?: (updated: CommunityPost) => void
  onUserClick?: (userId: number) => void
  onDelete?: (post: CommunityPost) => void
  onReport?: (post: CommunityPost, reason: string) => void
  compact?: boolean
}

function PostCard({ post, myUserId, token, onLike, onComment, onFollow, onReply, onVoted, onUserClick, onDelete, onReport, compact }: PostCardProps) {
  const isMe = post.author_id === myUserId
  const initials = authorInitials(post)
  const name = authorName(post)
  const time = formatRelativeTime(post.created_at)
  const avatarSrc = dicebearUrl(post.avatar_style, post.username ?? "")
  const [menuOpen, setMenuOpen] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/?post=${post.id}`
    const canShare = typeof navigator.share === "function"
    if (canShare) {
      try { await navigator.share({ title: "TickFeed Community", url }) } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast({ title: "Link copied to clipboard" }) } catch { /* ignore */ }
    }
  }

  return (
    <>
      {menuOpen && (
        <PostMenuSheet
          isOwn={isMe}
          onClose={() => setMenuOpen(false)}
          onDelete={onDelete ? () => onDelete(post) : undefined}
          onReport={onReport ? (reason) => onReport(post, reason) : undefined}
        />
      )}
      <article
        className="border-b border-border/50 px-4 py-6 hover:bg-muted/20 active:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => !compact && onComment(post)}
      >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar
          className={`h-10 w-10 shrink-0 ${!post.is_bot ? "cursor-pointer" : ""}`}
          onClick={(e) => { if (post.is_bot) return; e.stopPropagation(); onUserClick?.(post.author_id) }}
        >
          {avatarSrc && <AvatarImage src={avatarSrc} alt={initials} />}
          <AvatarFallback className={`text-sm font-bold ${post.is_bot ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
            {post.is_bot ? <Bot className="h-4 w-4" /> : initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Author row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`font-semibold text-sm text-foreground truncate ${!post.is_bot ? "cursor-pointer hover:underline" : ""}`}
                  onClick={(e) => { if (post.is_bot) return; e.stopPropagation(); onUserClick?.(post.author_id) }}
                >{name}</span>
                {post.is_bot && (
                  <span className="shrink-0 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">AI</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                @{post.username ?? "user"} · {time}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Follow button — never for yourself, never for bot */}
              {!isMe && !post.is_bot && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFollow(post) }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    post.is_following
                      ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                      : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {post.is_following ? "Following" : "Follow"}
                </button>
              )}
              {/* Three-dot menu — not for bots */}
              {!post.is_bot && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Hidden notice — only visible to the post owner */}
          {post.is_hidden && isMe && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5">
              <Flag className="h-3 w-3 text-destructive shrink-0" />
              <span className="text-[11px] font-semibold text-destructive">Hidden by reports — only you can see this</span>
            </div>
          )}

          {/* Content */}
          {!compact && (
            <p className="mt-2 text-[0.9375rem] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              <RichText text={post.content} />
            </p>
          )}
          {compact && (
            <p className="mt-2 text-sm text-foreground/90 leading-relaxed line-clamp-3">
              <RichText text={post.content} />
            </p>
          )}

          {/* Post image */}
          {!compact && post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border/40">
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full max-h-72 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Poll */}
          {!compact && post.poll_options && (
            <PollDisplay post={post} token={token} onVoted={onVoted} />
          )}

          {/* Hashtag from symbol field */}
          {post.symbol && (
            <span className="mt-1.5 inline-block text-xs font-semibold text-primary">
              #{post.symbol}
            </span>
          )}

          {/* Action bar */}
          {!compact && (
            <div className="mt-3 flex items-center gap-5">
              <button
                onClick={(e) => { e.stopPropagation(); onLike(post) }}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.liked_by_me ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                }`}
              >
                <Heart className={`h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                <span>{post.likes_count > 0 ? post.likes_count : ""}</span>
              </button>

              {!post.reply_to_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onComment(post) }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments_count > 0 ? post.comments_count : ""}</span>
                </button>
              )}

              {/* Reply button — only shown inside CommentsSheet (onReply provided) */}
              {onReply && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReply(post) }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
                  <span>Reply</span>
                </button>
              )}

              {!post.reply_to_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare() }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </article>
    </>
  )
}

// ── Compose sheet ─────────────────────────────────────────────────────────

interface ComposeSheetProps {
  token: string
  myUserId: number | null
  onClose: () => void
  onPosted: (post: CommunityPost) => void
}

function ComposeSheet({ token, myUserId: _myUserId, onClose, onPosted }: ComposeSheetProps) {
  const [content, setContent] = useState("")
  const [posting, setPosting] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollOptions, setPollOptions] = useState(["", ""])
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX = 500

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  const showError = (msg: string) => {
    if (validationTimer.current) clearTimeout(validationTimer.current)
    setValidationError(msg)
    validationTimer.current = setTimeout(() => setValidationError(""), 2500)
  }

  const handleChange = useCallback((val: string) => {
    if (/@\w+/.test(val)) {
      setContent(val.replace(/@\w+/g, ""))
      if (validationTimer.current) clearTimeout(validationTimer.current)
      setValidationError("Mentions aren't allowed in posts")
      validationTimer.current = setTimeout(() => setValidationError(""), 2500)
      return
    }
    setContent(val)
  }, [])

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { showError("Image must be under 10 MB"); return }
    setPendingImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setPendingImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const togglePoll = () => {
    if (pollOpen) setPollOptions(["", ""])
    setPollOpen((p) => !p)
  }

  const handlePost = async () => {
    const trimmed = content.trim()
    if (!trimmed || posting) return
    if (trimmed.length > MAX) { showError(`Max ${MAX} characters`); return }
    if (pollOpen) {
      const valid = pollOptions.map((o) => o.trim()).filter(Boolean)
      if (valid.length < 2) { showError("Add at least 2 poll options"); return }
    }
    setPosting(true)
    let blobUrl: string | undefined
    try {
      if (pendingImage) {
        setUploadingImage(true)
        try {
          const { sas_url, blob_url } = await requestUploadUrl(token, "post", pendingImage.type || "image/jpeg")
          await uploadToBlob(sas_url, pendingImage)
          blobUrl = blob_url
        } catch {
          showError("Image upload failed — posting without image")
        } finally {
          setUploadingImage(false)
        }
      }
      const opts = pollOpen ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined
      const created = await createPost(token, trimmed, undefined, undefined, blobUrl, opts)
      onPosted(created)
      onClose()
    } catch {
      showError("Could not post. Please try again.")
    } finally {
      setPosting(false)
    }
  }

  const remaining = MAX - content.length

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", background: "rgba(0,0,0,0.45)" }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: "85dvh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
          <h2 className="font-bold text-base text-foreground">New Post</h2>
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting || content.length > MAX}
            className="rounded-full bg-primary px-5 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-all active:scale-95"
          >
            {posting ? (uploadingImage ? "Uploading…" : "Posting…") : "Post"}
          </button>
        </div>

        {/* Error banner */}
        {validationError && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {validationError}
          </div>
        )}

        {/* Compose area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-[180px]">
          <MentionTextarea
            value={content}
            onChange={handleChange}
            placeholder="What's on your mind?"
            inputRef={inputRef}
            maxHeight={320}
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-border/50">
              <img src={imagePreview} alt="Preview" className="w-full max-h-44 object-cover" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 rounded-full bg-black/65 p-1.5 text-white hover:bg-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span className="text-white text-xs font-semibold">Uploading…</span>
                </div>
              )}
            </div>
          )}

          {/* Poll options editor */}
          {pollOpen && (
            <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Poll options</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setPollOptions((prev) => prev.map((o, j) => j === i ? e.target.value : o))}
                    placeholder={`Option ${i + 1}`}
                    maxLength={80}
                    className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button
                  onClick={() => setPollOptions((prev) => [...prev, ""])}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-3 border-t border-border bg-muted/30">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePickImage}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              pendingImage ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Photo
          </button>
          <button
            onClick={togglePoll}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              pollOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Poll
          </button>
          <span className={`ml-auto mr-1 text-xs font-medium tabular-nums ${
            remaining < 0 ? "text-destructive font-bold" : remaining < 50 ? "text-amber-500" : "text-muted-foreground"
          }`}>
            {remaining}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Comments sheet ─────────────────────────────────────────────────────────

interface CommentsSheetProps {
  post: CommunityPost
  token: string
  myUserId: number | null
  onClose: (finalCommentCount: number) => void
  initialTickrPending?: boolean
  onUserClick?: (userId: number) => void
}

export function CommentsSheet({ post, token, myUserId, onClose, initialTickrPending = false, onUserClick }: CommentsSheetProps) {
  const [rootPost, setRootPost] = useState(post)
  const [comments, setComments] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [posting, setPosting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const commentErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tickrPending, setTickrPending] = useState(initialTickrPending)
  const [replyingTo, setReplyingTo] = useState<CommunityPost | null>(null)
  const [showTickrSuggest, setShowTickrSuggest] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getPostComments(token, post.id)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [post.id, token])

  // Wait for @tickr reply — primary: SSE stream; fallback: polling (up to 90 s)
  useEffect(() => {
    if (!tickrPending) return

    let settled = false
    let pollRef2: ReturnType<typeof setTimeout> | null = null
    let es: EventSource | null = null

    const refresh = () => {
      getPostComments(token, post.id)
        .then((fresh) => {
          setComments(fresh)
          const botReplied = fresh.some((c) => c.is_bot)
          if (botReplied && !settled) {
            settled = true
            setTickrPending(false)
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
          }
        })
        .catch(() => {})
    }

    // ── SSE listener ──────────────────────────────────────────────────────
    // Backend emits: data: {"type":"tickr_reply","root_post_id":…,"post_id":…}
    // No named event line → must use onmessage, then check type field.
    try {
      es = new EventSource(`${API_BASE}/api/community/stream?token=${encodeURIComponent(token)}`)
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === "tickr_reply" && (data.root_post_id === post.id || data.post_id === post.id)) {
            refresh()
          }
        } catch { /* non-JSON keepalive — ignore */ }
      }
      es.onerror = () => { es?.close(); es = null }
    } catch { /* SSE not supported — fallback only */ }

    // ── Fallback poll (every 4 s, up to 90 s = 22 attempts) ──────────────
    let attempts = 0
    const MAX = 22

    const poll = () => {
      if (settled) return
      attempts++
      refresh()
      if (attempts < MAX) {
        pollRef2 = setTimeout(poll, 4000)
      } else if (!settled) {
        settled = true
        setTickrPending(false)
      }
    }

    pollRef2 = setTimeout(poll, 4000)

    return () => {
      settled = true
      es?.close()
      if (pollRef2) clearTimeout(pollRef2)
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickrPending])

  const handleRootLike = useCallback(async () => {
    const prev = rootPost
    setRootPost((p) => ({ ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }))
    try {
      const res = prev.liked_by_me ? await unlikePost(token, prev.id) : await likePost(token, prev.id)
      setRootPost((p) => ({ ...p, likes_count: res.likes_count, liked_by_me: res.liked }))
    } catch {
      setRootPost(prev)
    }
  }, [rootPost, token])

  const handleRootVoted = useCallback((updated: CommunityPost) => {
    setRootPost(updated)
  }, [])

  const showCommentError = (msg: string) => {
    if (commentErrorTimer.current) clearTimeout(commentErrorTimer.current)
    setCommentError(msg)
    commentErrorTimer.current = setTimeout(() => setCommentError(""), 3000)
  }

  const handleInputChange = useCallback((val: string) => {
    // In nested replies @tickr is not allowed — strip it like any other mention
    const isNested = replyingTo !== null

    const cleaned = val.replace(/@(?!tickr\b)([a-zA-Z]\w+)/g, (_, name) => {
      if (!isNested && "tickr".startsWith(name.toLowerCase())) return `@${name}`
      return ""
    }).replace(isNested ? /@tickr\b/gi : /(?!)/g, "")

    if (cleaned !== val) {
      setCommentText(cleaned)
      showCommentError(isNested ? "Cannot tag @tickr in nested replies" : "Only @tickr can be tagged in replies")
      return
    }
    setCommentText(val)
    if (!isNested) {
      const at = val.lastIndexOf("@")
      if (at !== -1) {
        const after = val.slice(at + 1)
        setShowTickrSuggest(/^\w*$/.test(after) && "tickr".startsWith(after.toLowerCase()))
      } else {
        setShowTickrSuggest(false)
      }
    } else {
      setShowTickrSuggest(false)
    }
  }, [replyingTo])

  const handleReplyTo = (target: CommunityPost) => {
    setReplyingTo(target)
    setCommentText("")
    inputRef.current?.focus()
  }

  const handleComment = async () => {
    if (!commentText.trim() || posting) return
    const text = commentText.trim()
    const mentionsTickr = /@tickr\b/i.test(text)
    if (mentionsTickr && replyingTo !== null) {
      showCommentError("@tickr can only be tagged in direct replies")
      return
    }
    if (mentionsTickr) {
      const textWithoutTickr = text.replace(/@tickr\b/gi, "").trim()
      if (textWithoutTickr.length < 5) {
        showCommentError("Add context — tell @tickr what you want to know")
        return
      }
    }
    const targetReplyId = replyingTo?.id ?? post.id
    setPosting(true)
    try {
      const { API_BASE } = await import("@/lib/api")
      const res = await fetch(`${API_BASE}/api/community/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, reply_to_id: targetReplyId }),
      })
      if (res.ok) {
        const reply: CommunityPost = await res.json()
        setComments((prev) => [...prev, reply])
        setCommentText("")
        setReplyingTo(null)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
        if (mentionsTickr) setTickrPending(true)
      }
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const handleReplyLike = useCallback(async (reply: CommunityPost) => {
    // optimistic toggle
    setComments((prev) =>
      prev.map((c) =>
        c.id === reply.id
          ? { ...c, liked_by_me: !c.liked_by_me, likes_count: c.liked_by_me ? c.likes_count - 1 : c.likes_count + 1 }
          : c
      )
    )
    try {
      if (reply.liked_by_me) await unlikePost(token, reply.id)
      else await likePost(token, reply.id)
    } catch {
      // revert on failure
      setComments((prev) =>
        prev.map((c) =>
          c.id === reply.id
            ? { ...c, liked_by_me: reply.liked_by_me, likes_count: reply.likes_count }
            : c
        )
      )
    }
  }, [token])

  const handleReplyVoted = useCallback((updated: CommunityPost) => {
    setComments((prev) => prev.map((c) => c.id === updated.id ? updated : c))
  }, [])

  // Build a children map for tree rendering: parentId → children[]
  const childrenOf = useMemo(() => {
    const map = new Map<number, CommunityPost[]>()
    for (const c of comments) {
      if (c.reply_to_id == null) continue
      if (!map.has(c.reply_to_id)) map.set(c.reply_to_id, [])
      map.get(c.reply_to_id)!.push(c)
    }
    return map
  }, [comments])

  const noop = () => {}

  const handleReplyDelete = useCallback(async (target: CommunityPost) => {
    setComments((prev) => prev.filter((c) => c.id !== target.id))
    try {
      await deletePost(token, target.id)
      toast({ title: "Reply deleted" })
    } catch {
      setComments((prev) => [...prev, target].sort((a, b) => a.id - b.id))
      toast({ title: "Could not delete reply", description: "Please try again." })
    }
  }, [token])

  const handleReplyReport = useCallback(async (target: CommunityPost, reason: string) => {
    try {
      await reportPost(token, target.id, reason)
      toast({ title: "Post reported", description: "Thanks for keeping the community safe." })
    } catch {
      toast({ title: "Could not send report", description: "Please try again." })
    }
  }, [token])

  const handleFollow = useCallback(async (post: CommunityPost) => {
    const wasFollowing = post.is_following
    const toggle = (p: CommunityPost) =>
      p.author_id === post.author_id ? { ...p, is_following: !p.is_following } : p
    setRootPost((p) => toggle(p))
    setComments((prev) => prev.map(toggle))
    try {
      if (wasFollowing) await unfollowUser(token, post.author_id)
      else await followUser(token, post.author_id)
    } catch {
      const revert = (p: CommunityPost) =>
        p.author_id === post.author_id ? { ...p, is_following: wasFollowing } : p
      setRootPost((p) => revert(p))
      setComments((prev) => prev.map(revert))
    }
  }, [token])

  return (
    /* Full-screen slide-up over the community feed */
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">

      {/* ── Sticky header ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button
          onClick={() => onClose(comments.length)}
          className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-bold text-base text-foreground flex items-center gap-2">
          Comments
          {comments.length > 0 && (
            <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Original post (compact) */}
        <div className="bg-muted/20 border-b border-border/60">
          <PostCard post={rootPost} myUserId={myUserId} token={token} onLike={handleRootLike} onComment={noop} onFollow={handleFollow} onVoted={handleRootVoted} onUserClick={onUserClick} onDelete={handleReplyDelete} onReport={handleReplyReport} />
        </div>

        {/* "Replies" label */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Replies</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {loading ? (
          <div className="space-y-4 px-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center mb-4">
              <MessageCircle className="h-7 w-7 text-primary/40" />
            </div>
            <p className="font-semibold text-sm text-foreground">No replies yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to reply. Tag <span className="font-semibold text-emerald-500">@tickr</span> to get AI market insights.
            </p>
          </div>
        ) : (
          <div>
            {/* Recursive thread renderer */}
            {(function renderThread(parentId: number, depth: number): React.ReactNode {
              const children = childrenOf.get(parentId) ?? []
              if (children.length === 0) return null
              return children.map((c) => (
                <div key={c.id}>
                  {depth === 0 ? (
                    <PostCard
                      post={c}
                      myUserId={myUserId}
                      token={token}
                      onLike={handleReplyLike}
                      onComment={noop}
                      onFollow={handleFollow}
                      onReply={handleReplyTo}
                      onVoted={handleReplyVoted}
                      onUserClick={onUserClick}
                      onDelete={handleReplyDelete}
                      onReport={handleReplyReport}
                    />
                  ) : (
                    <div className="flex">
                      {Array.from({ length: depth }).map((_, i) => (
                        <div key={i} className="shrink-0 w-10 flex justify-center">
                          <div className="w-0.5 bg-border/50 self-stretch" />
                        </div>
                      ))}
                      <div className="flex-1 min-w-0">
                        <PostCard
                          post={c}
                          myUserId={myUserId}
                          token={token}
                          onLike={handleReplyLike}
                          onComment={noop}
                          onFollow={handleFollow}
                          onReply={depth < 2 ? handleReplyTo : undefined}
                          onVoted={handleReplyVoted}
                          onUserClick={onUserClick}
                          onDelete={handleReplyDelete}
                          onReport={handleReplyReport}
                        />
                      </div>
                    </div>
                  )}
                  {renderThread(c.id, depth + 1)}
                </div>
              ))
            })(post.id, 0)}
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── @tickr suggestion ── */}
      {showTickrSuggest && (
        <div className="shrink-0 border-t border-border bg-background">
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              const at = commentText.lastIndexOf("@")
              setCommentText(commentText.slice(0, at) + "@tickr ")
              setShowTickrSuggest(false)
              inputRef.current?.focus()
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted text-left transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">@tickr</p>
              <p className="text-[10px] text-muted-foreground">AI Market Analyst · tag for live insights</p>
            </div>
            <span className="shrink-0 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase">AI</span>
          </button>
        </div>
      )}

      {/* ── Tickr thinking indicator ── */}
      {tickrPending && (
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-primary/5 border-t border-primary/20">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-primary font-medium">@tickr is thinking…</span>
        </div>
      )}

      {/* ── Sticky comment input — always visible at bottom ── */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        {/* Inline error */}
        {commentError && (
          <div className="flex items-center gap-2 mb-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {commentError}
          </div>
        )}
        {/* "Replying to @username" chip */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">
              Replying to <span className="text-emerald-500 font-semibold">@{replyingTo.username ?? "user"}</span>
            </span>
            <button
              onClick={() => { setReplyingTo(null); setCommentText("") }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
          <MentionTextarea
            value={commentText}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleComment())}
            placeholder={replyingTo ? "Write a reply…" : "Write a reply… tag @tickr for AI insights"}
            inputRef={inputRef}
            maxHeight={96}
          />
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || posting}
            className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-35 transition-all active:scale-95 mb-0.5"
          >
            {posting
              ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alpha Score (shared with profile-screen) ──────────────────────────────
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

// ── Main community screen ──────────────────────────────────────────────────

const TABS = [
  { label: "Trending",  tab: "trending"  as const },
  { label: "Following", tab: "following" as const },
  { label: "My Posts",  tab: "mine"      as const },
]

interface CommunityScreenProps { token: string; initialPostId?: number }

export function CommunityScreen({ token, initialPostId }: CommunityScreenProps) {
  const myUserId = getMyUserId(token)

  const [activeTab,   setActiveTab]   = useState(0)
  const [posts,       setPosts]       = useState<CommunityPost[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")

  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState("")
  const [searchResults, setSearchResults] = useState<CommunityPost[]>([])
  const [searching,     setSearching]     = useState(false)

  const [composeOpen,   setComposeOpen]   = useState(false)
  const [selectedPost,  setSelectedPost]  = useState<CommunityPost | null>(null)
  const [newPostCount,  setNewPostCount]  = useState(0)

  const [profileUser,   setProfileUser]   = useState<PublicUserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const searchRef  = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)

  // ── Data fetching ────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchPosts(activeTab)
    setNewPostCount(0)
  }, [activeTab, fetchPosts])

  // SSE subscription — listen for new top-level posts
  useEffect(() => {
    if (!token) return
    const url = `${API_BASE}/api/community/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === "new_post") {
          setNewPostCount((n) => n + 1)
        }
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Deep-link: open specific post from shared URL ───────────────────
  const initialPostHandled = useRef(false)
  useEffect(() => {
    if (!initialPostId || initialPostHandled.current || !token) return
    initialPostHandled.current = true
    getPostById(token, initialPostId)
      .then((post) => setSelectedPost(post))
      .catch(() => {})
  }, [initialPostId, token])

  // ── Pull-to-refresh ─────────────────────────────────────────────────
  const handlePullRefresh = useCallback(async () => {
    await fetchPosts(activeTab)
  }, [activeTab, fetchPosts])
  const { pullState } = usePullToRefresh(scrollRef, handlePullRefresh)

  // ── Search ───────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try { setSearchResults(await searchCommunityPosts(token, q)) }
    catch { setSearchResults([]) }
    finally { setSearching(false) }
  }, [token])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), 350)
  }

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 60)
  }
  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])
  }

  // ── Like ─────────────────────────────────────────────────────────────
  const handleLike = async (post: CommunityPost) => {
    const toggle = (p: CommunityPost): CommunityPost =>
      p.id === post.id
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    setPosts((prev) => prev.map(toggle))
    if (selectedPost?.id === post.id)
      setSelectedPost((p) => p ? toggle(p) : p)
    try {
      const res = post.liked_by_me ? await unlikePost(token, post.id) : await likePost(token, post.id)
      const sync = (p: CommunityPost): CommunityPost =>
        p.id === post.id ? { ...p, likes_count: res.likes_count, liked_by_me: res.liked } : p
      setPosts((prev) => prev.map(sync))
    } catch {
      const revert = (p: CommunityPost): CommunityPost =>
        p.id === post.id ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : p
      setPosts((prev) => prev.map(revert))
    }
  }

  // ── Follow ───────────────────────────────────────────────────────────
  const handleFollow = async (post: CommunityPost) => {
    const wasFollowing = post.is_following
    const toggleFollow = (p: CommunityPost): CommunityPost =>
      p.author_id === post.author_id ? { ...p, is_following: !p.is_following } : p
    setPosts((prev) => prev.map(toggleFollow))
    try {
      if (wasFollowing) await unfollowUser(token, post.author_id)
      else await followUser(token, post.author_id)
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.author_id === post.author_id ? { ...p, is_following: wasFollowing } : p
      ))
    }
  }

  // ── Delete own post ──────────────────────────────────────────────────
  const handleDelete = async (post: CommunityPost) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
    try {
      await deletePost(token, post.id)
      toast({ title: "Post deleted" })
    } catch {
      setPosts((prev) => [post, ...prev])
      toast({ title: "Could not delete post", description: "Please try again." })
    }
  }

  // ── Report a post ─────────────────────────────────────────────────────
  const handleReport = async (post: CommunityPost, reason: string) => {
    try {
      await reportPost(token, post.id, reason)
      toast({ title: "Post reported", description: "Thanks for keeping the community safe." })
    } catch {
      toast({ title: "Could not send report", description: "Please try again." })
    }
  }

  // ── Poll vote propagation ────────────────────────────────────────────
  const handleVoted = (updated: CommunityPost) => {
    setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    if (selectedPost?.id === updated.id) setSelectedPost(updated)
  }

  // ── Post created (own) ───────────────────────────────────────────────
  const handlePosted = (created: CommunityPost) => {
    if (activeTab === 2) {
      // Already on My Posts — prepend optimistically
      setPosts((prev) => [created, ...prev])
    } else {
      // Switching to My Posts — useEffect will fetch the full list
      setActiveTab(2)
    }
    setNewPostCount(0)
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    toast({ title: "Posted!", description: "Your post is live on the community." })
    if (/@tickr\b/i.test(created.content)) setSelectedPost(created)
  }

  // ── User profile click ───────────────────────────────────────────────
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

  // ── Load new posts from banner tap ───────────────────────────────────
  const handleLoadNew = async () => {
    setNewPostCount(0)
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    await fetchPosts(activeTab)
  }

  // ── Render ────────────────────────────────────────────────────────────
  const displayPosts = searchOpen && searchQuery ? searchResults : posts

  return (
    <div className="flex h-full flex-col bg-background relative">

      {/* ── Header ── */}
      <header className="px-4 pb-2 pt-4 bg-background sticky top-0 z-10 border-b border-border/50">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <button onClick={closeSearch} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search community posts…"
                className="w-full rounded-full bg-muted py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button onClick={() => handleSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Community</h1>
              <p className="text-xs text-muted-foreground">Discuss markets with investors</p>
            </div>
            <button
              onClick={openSearch}
              className="rounded-full p-2.5 text-foreground hover:bg-muted transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>


      {/* ── Tabs (hidden during search) ── */}
      {!searchOpen && (
        <div className="flex gap-0 border-b border-border px-4">
          {TABS.map((t, i) => (
            <button
              key={t.tab}
              onClick={() => setActiveTab(i)}
              className={`relative py-3 px-4 text-sm font-medium transition-colors ${
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
      )}

      {/* ── Pull-to-refresh ── */}
      <div className={`flex items-center justify-center gap-2 overflow-hidden bg-background transition-all duration-300 ${pullState !== "idle" ? "h-10" : "h-0"}`}>
        <RefreshCw className={`h-4 w-4 text-primary ${pullState === "refreshing" ? "animate-spin" : ""}`} />
        <span className="text-xs text-muted-foreground">{pullState === "refreshing" ? "Refreshing…" : "Release to refresh"}</span>
      </div>

      {/* ── "New posts" banner ── */}
      {newPostCount > 0 && !searchOpen && (
        <button
          onClick={handleLoadNew}
          className="mx-4 my-2 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg animate-bounce-subtle transition-all"
        >
          <span>↑</span>
          <span>{newPostCount} new {newPostCount === 1 ? "post" : "posts"} — tap to load</span>
        </button>
      )}

      {/* ── Post list ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20">
        {/* Search state */}
        {searchOpen && searchQuery && (
          <p className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border/50">
            {searching ? "Searching…" : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${searchQuery}"`}
          </p>
        )}

        {loading && !searchOpen ? (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-border/50 px-4 py-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 rounded bg-muted" />
                      <div className="h-3 w-14 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-muted-foreground text-sm">{error}</p>
            <button onClick={() => fetchPosts(activeTab)} className="mt-3 text-sm text-primary hover:underline">Try again</button>
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              {searchOpen
                ? <Search className="h-7 w-7 text-muted-foreground/50" />
                : activeTab === 1
                ? <TrendingUp className="h-7 w-7 text-muted-foreground/50" />
                : <MessageCircle className="h-7 w-7 text-muted-foreground/50" />
              }
            </div>
            <p className="font-semibold text-foreground text-sm">
              {searchOpen ? "No results found" : activeTab === 1 ? "Follow investors to see their posts" : "No posts yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchOpen
                ? "Try a different keyword or hashtag"
                : activeTab === 1
                ? "Tap Follow on any post to add them to your feed"
                : "Be the first — tap + to share your insight"}
            </p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              myUserId={myUserId}
              token={token}
              onLike={handleLike}
              onComment={setSelectedPost}
              onFollow={handleFollow}
              onVoted={handleVoted}
              onUserClick={handleUserClick}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          ))
        )}
      </div>

      {/* ── FAB ── */}
      {!searchOpen && (
        <button
          onClick={() => setComposeOpen(true)}
          className="absolute bottom-5 right-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* ── Compose sheet ── */}
      {composeOpen && (
        <ComposeSheet
          token={token}
          myUserId={myUserId}
          onClose={() => setComposeOpen(false)}
          onPosted={handlePosted}
        />
      )}

      {/* ── User profile overlay ── */}
      {(profileUser || profileLoading) && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-background">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
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
                {/* Avatar + name hero */}
                <div className="flex flex-col items-center pt-10 pb-6 px-6 text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={pInitials} />}
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{pInitials}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-black text-foreground">{pName}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">@{profileUser.username ?? "user"}</p>

                  {/* Follow button */}
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

                {/* Alpha score card */}
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

                {/* Stats row */}
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

      {/* ── Comments sheet ── */}
      {selectedPost && (
        <CommentsSheet
          post={selectedPost}
          token={token}
          myUserId={myUserId}
          initialTickrPending={/@tickr\b/i.test(selectedPost.content) && selectedPost.comments_count === 0}
          onUserClick={handleUserClick}
          onClose={(finalCount) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === selectedPost.id ? { ...p, comments_count: finalCount } : p
              )
            )
            setSelectedPost(null)
          }}
        />
      )}
    </div>
  )
}
