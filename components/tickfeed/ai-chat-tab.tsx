"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Send } from "lucide-react"
import { API_BASE, getStockChatHistory, getChatHistory, type ChatHistoryMessage } from "@/lib/api"

interface AiChatTabProps {
  token: string
  mode: "article" | "stock"
  contextId: number | string  // newsId for article, symbol for stock
  isActive: boolean
  welcomeMessage?: string
  suggestedQuestions?: Array<{ q: string; icon: string }>
  chatEndpoint: string        // e.g. /api/news/123/chat or /api/stocks/RELIANCE/chat
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  events?: string[]
}

const THINKING_PHRASES = [
  "Analysing market data…",
  "Checking live prices…",
  "Processing your question…",
  "Consulting indicators…",
  "Fetching insights…",
  "Running analysis…",
  "Almost there…",
]

function ThinkingStatus({ events }: { events?: string[] }) {
  const [phraseIdx, setPhraseIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length), 1800)
    return () => clearInterval(t)
  }, [])
  const lastEvent = events?.length
    ? (() => { try { return JSON.parse(events[events.length - 1]).content } catch { return events[events.length - 1] } })()
    : null
  return (
    <p className="text-sm text-muted-foreground animate-pulse">{lastEvent || THINKING_PHRASES[phraseIdx]}</p>
  )
}

export function AiChatTab({ token, mode, contextId, isActive, welcomeMessage, suggestedQuestions, chatEndpoint }: AiChatTabProps) {
  const INIT_MESSAGE: ChatMessage = {
    id: "init",
    role: "assistant",
    content: welcomeMessage ?? "Hi! Ask me anything about this topic or Indian markets.",
  }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INIT_MESSAGE])
  const [inputValue, setInputValue] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load persisted history on first activation
  useEffect(() => {
    if (!isActive || historyLoaded) return
    setHistoryLoaded(true)
    setHistoryLoading(true)
    const fetchHistory = mode === "article"
      ? getChatHistory(token, contextId as number)
      : getStockChatHistory(token, contextId as string)
    fetchHistory
      .then((history: ChatHistoryMessage[]) => {
        if (history.length > 0) {
          const restored: ChatMessage[] = history.map((m, i) => ({ id: `h-${i}`, role: m.role, content: m.content }))
          setChatMessages([INIT_MESSAGE, ...restored])
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, historyLoaded, token, mode, contextId])

  useEffect(() => {
    if (isActive) chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, isActive])

  const sendMessage = useCallback(async (content: string, currentMessages: ChatMessage[]) => {
    if (!content.trim() || chatLoading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content }
    const aiMsgId = (Date.now() + 1).toString()
    const aiMsg: ChatMessage = { id: aiMsgId, role: "assistant", content: "", events: [] }
    const history = [...currentMessages, userMsg].map((m) => ({ role: m.role, content: m.content }))
    setChatMessages((prev) => [...prev, userMsg, aiMsg])
    setChatLoading(true)
    try {
      const res = await fetch(`${API_BASE}${chatEndpoint}`, {
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
  }, [chatLoading, chatEndpoint, token])

  const handleSend = async () => {
    if (!inputValue.trim() || chatLoading) return
    const content = inputValue.trim()
    setInputValue("")
    await sendMessage(content, chatMessages)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {historyLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <svg className="h-7 w-7 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs text-muted-foreground">Fetching your chat…</span>
        </div>
      ) : null}
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 ${historyLoading ? "hidden" : ""}`}>
        {chatMessages.length <= 1 && !chatLoading && (
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <p className="font-semibold text-foreground text-base">Ask Tickr AI</p>
            <p className="text-xs text-muted-foreground mt-1 text-center px-6">
              Instant market insights — prices, technicals, what it means for you.
            </p>
            {suggestedQuestions && (
              <div className="w-full mt-5 space-y-2">
                {suggestedQuestions.map(({ q, icon }) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q, chatMessages)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/70 border border-border/50 text-left transition-colors"
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm text-foreground">{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {chatMessages.map((message, idx) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-primary mb-1.5 uppercase tracking-wide">Tickr AI</p>
                  {message.events && message.events.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
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
                  )}
                  {!message.content && chatLoading && idx === chatMessages.length - 1 ? (
                    <ThinkingStatus events={message.events} />
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* Input */}
      <div className="px-4 pt-2 pb-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask about price, technicals, outlook…"
            rows={2}
            disabled={chatLoading}
            className="flex-1 resize-none rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || chatLoading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
