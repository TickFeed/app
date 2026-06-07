"use client"

import { useState } from "react"
import { Flame, X } from "lucide-react"
import type { DailyPoll } from "@/lib/api"

interface DailyCheckinSheetProps {
  streakCount: number
  poll: DailyPoll | null
  onVote: (pollId: number, optionIdx: number) => Promise<{ my_vote: number; vote_counts: number[]; total_votes: number }>
  onClose: () => void
}

export function DailyCheckinSheet({ streakCount, poll: initialPoll, onVote, onClose }: DailyCheckinSheetProps) {
  const [poll, setPoll] = useState(initialPoll)
  const [voting, setVoting] = useState(false)

  const hasVoted = poll?.my_vote != null
  const total = poll?.total_votes ?? 0

  const handleVote = async (optionIdx: number) => {
    if (!poll || voting || hasVoted) return
    setVoting(true)
    try {
      const result = await onVote(poll.id, optionIdx)
      setPoll((p) => p ? { ...p, ...result } : p)
    } catch {
      // silent
    } finally {
      setVoting(false)
    }
  }

  const streakMessage =
    streakCount === 1 ? "Day 1 — great start!" :
    streakCount === 7 ? "7 days — one week streak!" :
    streakCount === 30 ? "30 days — incredible!" :
    `${streakCount} day streak!`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl bg-background pb-6 pt-5 px-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Streak section */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/15 border border-orange-500/20">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="font-bold text-foreground text-base">{streakMessage}</p>
            <p className="text-xs text-muted-foreground">Keep opening TickFeed daily to maintain your streak</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 mb-5" />

        {/* Poll section */}
        {poll ? (
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Today's Poll</p>
            <p className="text-base font-semibold text-foreground mb-4 leading-snug">{poll.question}</p>

            <div className="flex flex-col gap-2">
              {poll.options.map((option, idx) => {
                const votes = poll.vote_counts[idx] ?? 0
                const pct = total > 0 ? Math.round((votes / total) * 100) : 0
                const isMyVote = poll.my_vote === idx

                return (
                  <button
                    key={idx}
                    onClick={() => handleVote(idx)}
                    disabled={hasVoted || voting}
                    className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-all
                      ${hasVoted
                        ? isMyVote
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30"
                        : "border-border hover:border-primary/50 hover:bg-muted/40 active:scale-[0.98]"
                      }`}
                  >
                    {/* Result bar fills behind text after voting */}
                    {hasVoted && (
                      <span
                        className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${isMyVote ? "bg-primary/15" : "bg-muted/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    )}

                    <span className="relative flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${isMyVote ? "text-primary" : "text-foreground"}`}>
                        {option}
                      </span>
                      {hasVoted && (
                        <span className={`text-xs font-bold tabular-nums ${isMyVote ? "text-primary" : "text-muted-foreground"}`}>
                          {pct}%
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            {hasVoted && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {total} {total === 1 ? "vote" : "votes"} so far
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">No poll today — check back tomorrow!</p>
        )}

        {/* Done button — only shown after voting or if no poll */}
        {(hasVoted || !poll) && (
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
          >
            Let's go
          </button>
        )}
      </div>
    </div>
  )
}
