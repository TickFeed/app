"use client"

import { useState, useRef } from "react"
import { ChevronLeft, X, Image as ImageIcon, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { requestUploadUrl, uploadToBlob, submitSupportTicket } from "@/lib/api"

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Account Issue",
  "Content Issue",
  "Other",
]

interface HelpSupportScreenProps {
  token: string
  onBack: () => void
}

export function HelpSupportScreen({ token, onBack }: HelpSupportScreenProps) {
  const [category, setCategory]     = useState(CATEGORIES[0])
  const [subject, setSubject]       = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10 MB"); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError("")
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim() || submitting) return
    setError("")
    setSubmitting(true)

    let imageUrl: string | undefined
    if (imageFile) {
      setUploadingImage(true)
      try {
        const { sas_url, blob_url } = await requestUploadUrl(token, "post", imageFile.type || "image/jpeg")
        await uploadToBlob(sas_url, imageFile)
        imageUrl = blob_url
      } catch {
        setError("Image upload failed — submitting without screenshot")
      } finally {
        setUploadingImage(false)
      }
    }

    try {
      await submitSupportTicket(token, {
        category,
        subject: subject.trim(),
        description: description.trim(),
        imageUrl,
      })
      setSubmitted(true)
    } catch {
      setError("Could not submit your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col bg-background">
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <button onClick={onBack} className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-base text-foreground">Help & Support</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">Request Submitted</h3>
          <p className="text-sm text-muted-foreground mb-8">
            We've received your message and will get back to you as soon as possible.
          </p>
          <button
            onClick={onBack}
            className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground active:scale-95 transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <button onClick={onBack} className="rounded-full p-1.5 text-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-bold text-base text-foreground">Help & Support</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            maxLength={120}
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail — what happened, what you expected, and steps to reproduce if applicable."
            rows={6}
            maxLength={2000}
            className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
          />
          <p className="text-right text-[11px] text-muted-foreground mt-1">{description.length}/2000</p>
        </div>

        {/* Screenshot */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Screenshot <span className="normal-case font-normal">(optional)</span></label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePickImage}
          />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border/50">
              <img src={imagePreview} alt="Screenshot" className="w-full max-h-52 object-cover" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 rounded-full bg-black/65 p-1.5 text-white"
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
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              Attach a screenshot
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="shrink-0 px-4 py-4 border-t border-border bg-background">
        <button
          onClick={handleSubmit}
          disabled={!subject.trim() || !description.trim() || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              {uploadingImage ? "Uploading image…" : "Sending…"}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to Support
            </>
          )}
        </button>
      </div>
    </div>
  )
}
