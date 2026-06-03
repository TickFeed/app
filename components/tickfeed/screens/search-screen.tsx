"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, Search, X, Newspaper } from "lucide-react"
import { NewsCard } from "@/components/tickfeed/news-card"
import {
  searchArticles,
  getTrendingTopics,
  formatRelativeTime,
  sourceToIcon,
  type FeedItem,
  type TrendingTopic,
} from "@/lib/api"
import type { NewsArticle } from "@/app/page"

interface SearchScreenProps {
  token: string
  onBack: () => void
  onArticleClick: (article: NewsArticle) => void
}

function feedItemToArticle(item: FeedItem): NewsArticle {
  return {
    id: String(item.id),
    url: item.url,
    source: { name: item.source, icon: sourceToIcon(item.source) },
    timestamp: formatRelativeTime(item.published ?? item.created_at),
    headline: item.title,
    tags: [],
    aiSummaryAvailable: !!item.summary,
    commentsCount: (item as FeedItem & { comments_count?: number | null }).comments_count ?? 0,
    imageUrl: item.image_url ?? "",
    content: item.summary ?? undefined,
  }
}

const CATEGORY_CHIPS = [
  "RBI Policy", "Q4 Results", "FII Flows", "Nifty50",
  "IPO", "Budget", "Sensex", "Inflation",
]

export function SearchScreen({ token, onBack, onArticleClick }: SearchScreenProps) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<FeedItem[]>([])
  const [loading, setLoading]   = useState(false)
  const [trending, setTrending] = useState<TrendingTopic[]>([])
  const [searched, setSearched] = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    getTrendingTopics(token).then(setTrending).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      setResults(await searchArticles(token, q.trim()))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [token])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 350)
  }

  const handleChipClick = (chip: string) => {
    setQuery(chip)
    runSearch(chip)
    inputRef.current?.focus()
  }

  const handleClear = () => {
    setQuery("")
    setResults([])
    setSearched(false)
    inputRef.current?.focus()
  }

  const suggestions: string[] = [
    ...trending.slice(0, 6).map((t) => t.topic),
    ...CATEGORY_CHIPS,
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 12)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Sticky header */}
      <header className="flex items-center gap-2 px-3 py-3 bg-background border-b border-border sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex-shrink-0 rounded-full p-2 text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search TickFeed…"
            className="w-full rounded-full bg-muted py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {query.length > 0 && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!searched ? (
          <div className="px-4 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trending on TickFeed
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-0 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-4 py-4 border-b border-border/50 animate-pulse">
                <div className="flex gap-2 mb-2">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
                <div className="h-4 w-full rounded bg-muted mb-1" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div>
            <p className="px-4 py-2.5 text-xs text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
            {results.map((item) => {
              const article = feedItemToArticle(item)
              return (
                <NewsCard
                  key={item.id}
                  source={article.source}
                  timestamp={article.timestamp}
                  headline={article.headline}
                  tags={article.tags}
                  aiSummaryAvailable={article.aiSummaryAvailable}
                  commentsCount={article.commentsCount}
                  imageUrl={article.imageUrl}
                  onClick={() => onArticleClick(article)}
                />
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <Newspaper className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No articles found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different keyword, source name, or stock symbol
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.slice(0, 6).map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
