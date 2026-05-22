"use client"

import React from "react"

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic text-foreground/80">{part.slice(1, -1)}</em>
    return <span key={i}>{part}</span>
  })
}

export function AiMarkdown({ content, streaming }: { content: string; streaming?: boolean }) {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (!line) { i++; continue }

    // Bullet list — collect consecutive items
    if (/^[-•*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      nodes.push(
        <ul key={nodes.length} className="space-y-1.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-primary flex-shrink-0 mt-0.5">▸</span>
              <span className="text-foreground/90">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""))
        i++
      }
      nodes.push(
        <ol key={nodes.length} className="space-y-1.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="text-primary font-bold flex-shrink-0 w-4 text-right">{j + 1}.</span>
              <span className="text-foreground/90">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Heading
    if (line.startsWith("### ")) {
      nodes.push(<p key={nodes.length} className="text-sm font-semibold text-foreground mt-3 mb-0.5">{line.slice(4)}</p>)
      i++; continue
    }
    if (line.startsWith("## ")) {
      nodes.push(<p key={nodes.length} className="text-sm font-bold text-foreground mt-3 mb-1">{line.slice(3)}</p>)
      i++; continue
    }

    // Regular paragraph
    nodes.push(
      <p key={nodes.length} className="text-sm leading-relaxed text-foreground/90">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className="space-y-2">
      {nodes}
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-primary rounded-full animate-pulse align-middle ml-0.5" />
      )}
    </div>
  )
}
