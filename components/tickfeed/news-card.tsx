"use client"

import { Sparkles, Bookmark, MessageSquare } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface NewsCardProps {
  source: {
    name: string
    icon?: string
  }
  timestamp: string
  headline: string
  tags: string[]
  aiSummaryAvailable: boolean
  commentsCount?: number
  imageUrl?: string
  onClick?: () => void
}

export function NewsCard({
  source,
  timestamp,
  headline,
  tags,
  aiSummaryAvailable,
  commentsCount = 0,
  imageUrl,
  onClick,
}: NewsCardProps) {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer border-b border-border/50 p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex gap-3">
        {/* Main content */}
        <div className="flex-1">
          {/* Source and timestamp */}
          <div className="mb-2 flex items-center gap-2">
            {source.icon && (
              <div className="flex h-5 w-5 items-center justify-center rounded bg-secondary">
                <span className="text-[10px] font-bold text-secondary-foreground">
                  {source.icon}
                </span>
              </div>
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {source.name}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>

          {/* Headline */}
          <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {headline}
          </h3>

          {/* Tags and AI summary indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] font-medium px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            
            {aiSummaryAvailable && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>AI Summary</span>
                <span className="text-muted-foreground/60">○</span>
                <MessageSquare className="h-3 w-3" />
                <span>{commentsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        {imageUrl && (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Bookmark */}
        <button 
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}
