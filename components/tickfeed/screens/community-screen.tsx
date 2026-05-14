"use client"

import { useState } from "react"
import { Search, TrendingUp, MessageSquare, ThumbsUp, Share2, Send, Heart } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const TABS = ["Trending", "Following", "My Posts"]

const DISCUSSIONS = [
  {
    id: "1",
    author: {
      name: "Rahul Sharma",
      initials: "RS",
      verified: true,
    },
    timestamp: "2h ago",
    content: "RBI keeping rates unchanged is actually smart. With global uncertainty, they are playing it safe. What do you all think about the impact on banking stocks?",
    tags: ["#RBI", "#Banking"],
    likes: 234,
    comments: 45,
    shares: 12,
    isLiked: false,
  },
  {
    id: "2",
    author: {
      name: "Priya Patel",
      initials: "PP",
      verified: false,
    },
    timestamp: "4h ago",
    content: "TCS winning the $500M deal is huge for IT sector sentiment. Expecting more deals to flow in Q2. Long on TCS and INFY",
    tags: ["#TCS", "#ITSector"],
    likes: 156,
    comments: 32,
    shares: 8,
    isLiked: false,
  },
  {
    id: "3",
    author: {
      name: "Amit Kumar",
      initials: "AK",
      verified: true,
    },
    timestamp: "5h ago",
    content: "Reliance green energy push could reshape the entire energy landscape in India. $10B is no joke. This is a decade-long play.",
    tags: ["#RELIANCE", "#GreenEnergy"],
    likes: 312,
    comments: 67,
    shares: 24,
    isLiked: false,
  },
  {
    id: "4",
    author: {
      name: "Sneha Gupta",
      initials: "SG",
      verified: false,
    },
    timestamp: "6h ago",
    content: "HDFC Bank Q4 results exceeded expectations. Asset quality improvement is the real story here. Management execution has been stellar.",
    tags: ["#HDFCBANK", "#Earnings"],
    likes: 189,
    comments: 41,
    shares: 15,
    isLiked: false,
  },
]

export function CommunityScreen() {
  const [activeTab, setActiveTab] = useState("Trending")
  const [discussions, setDiscussions] = useState(DISCUSSIONS)
  const [newPost, setNewPost] = useState("")

  const handleLike = (id: string) => {
    setDiscussions(prev => prev.map(d => 
      d.id === id 
        ? { ...d, likes: d.isLiked ? d.likes - 1 : d.likes + 1, isLiked: !d.isLiked }
        : d
    ))
  }

  const handlePost = () => {
    if (!newPost.trim()) return
    
    const newDiscussion = {
      id: Date.now().toString(),
      author: {
        name: "You",
        initials: "YO",
        verified: false,
      },
      timestamp: "Just now",
      content: newPost,
      tags: [],
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
    }
    
    setDiscussions(prev => [newDiscussion, ...prev])
    setNewPost("")
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
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Trending Topics */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Trending Topics</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["#RBIPolicy", "#TCSResults", "#NiftyAt22K", "#BankingStocks"].map((topic) => (
            <Badge key={topic} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
              {topic}
            </Badge>
          ))}
        </div>
      </div>

      {/* Discussions List */}
      <div className="flex-1 overflow-y-auto">
        {discussions.map((discussion) => (
          <article
            key={discussion.id}
            className="border-b border-border/50 p-4 hover:bg-muted/30 transition-colors"
          >
            {/* Author */}
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {discussion.author.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {discussion.author.name}
                  </span>
                  {discussion.author.verified && (
                    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {discussion.timestamp}
                  </span>
                </div>
                
                {/* Content */}
                <p className="mt-1 text-sm text-foreground leading-relaxed">
                  {discussion.content}
                </p>
                
                {/* Tags */}
                {discussion.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {discussion.tags.map((tag) => (
                      <span key={tag} className="text-xs text-primary hover:underline cursor-pointer">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="mt-3 flex items-center gap-6">
                  <button 
                    onClick={() => handleLike(discussion.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      discussion.isLiked 
                        ? "text-loss" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${discussion.isLiked ? "fill-current" : ""}`} />
                    <span className="text-xs">{discussion.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">{discussion.comments}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs">{discussion.shares}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
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
            disabled={!newPost.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
