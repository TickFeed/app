"use client"

import { useState } from "react"
import { Sparkles, Trash2 } from "lucide-react"
import { AiChatTab } from "@/components/tickfeed/ai-chat-tab"
import { clearGlobalAIChatHistory } from "@/lib/api"

interface GlobalAIScreenProps {
  token: string
}

const SUGGESTED = [
  { q: "What's moving the market today?" },
  { q: "Top Nifty 50 movers this week?" },
  { q: "Any major corporate announcements?" },
  { q: "What's happening with banking stocks?" },
  { q: "Summarise today's market sentiment" },
]

export function GlobalAIScreen({ token }: GlobalAIScreenProps) {
  const [chatKey, setChatKey] = useState(0)
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    if (clearing) return
    setClearing(true)
    try {
      await clearGlobalAIChatHistory(token)
      setChatKey((k) => k + 1)
    } catch { /* non-fatal */ }
    finally { setClearing(false) }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="shrink-0 flex items-center justify-between px-4 pb-3 pt-4 border-b border-border safe-area-pt">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Tickr AI</h1>
            <p className="text-[11px] text-muted-foreground">Powered by your market data</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <AiChatTab
        key={chatKey}
        token={token}
        mode="global"
        isActive={true}
        chatEndpoint="/api/ai/chat"
        welcomeMessage="Hi! I'm Tickr, your AI market assistant. Ask me about stocks, news, market trends, or anything about Indian equity markets."
        suggestedQuestions={SUGGESTED}
      />
    </div>
  )
}
