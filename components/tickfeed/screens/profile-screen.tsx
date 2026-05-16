"use client"

import { Settings, ChevronRight, Bell, Bookmark, Clock, HelpCircle, LogOut, Moon, Sun, Camera } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AuthUser } from "@/lib/auth"

const AVATAR_STYLES = [
  { id: "initials",      label: "Initials"  },
  { id: "adventurer",    label: "Adventurer" },
  { id: "fun-emoji",     label: "Emoji"     },
  { id: "pixel-art",     label: "Pixel"     },
  { id: "bottts",        label: "Robot"     },
  { id: "lorelei",       label: "Portrait"  },
]
const AVATAR_STYLE_KEY = "tickfeed-avatar-style"

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=80`
}

const editSchema = z.object({
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
})
type EditFormValues = z.infer<typeof editSchema>

const MENU_ITEMS = [
  { icon: Bell,        label: "Notifications",   description: "Manage your alert preferences", hasArrow: true },
  { icon: Bookmark,    label: "Saved Articles",   description: "12 articles saved",            hasArrow: true },
  { icon: Clock,       label: "Reading History",  description: "Your recent activity",          hasArrow: true },
  { icon: Settings,    label: "Settings",         description: "App preferences",              hasArrow: true },
  { icon: HelpCircle,  label: "Help & Support",   description: "FAQs and contact us",          hasArrow: true },
]

const WATCHLIST_PREVIEW = [
  { symbol: "HDFCBANK", change: "+1.28%", isPositive: true },
  { symbol: "TCS",      change: "+2.18%", isPositive: true },
  { symbol: "RELIANCE", change: "-0.28%", isPositive: false },
  { symbol: "INFY",     change: "+1.02%", isPositive: true },
]

interface ProfileScreenProps {
  user: AuthUser
  onSignOut: () => void
  onUpdateUser: (fields: { firstName?: string; lastName?: string; username?: string; theme?: 'light' | 'dark' }) => Promise<{ user: AuthUser } | { error: string; field?: "username" }>
}

export function ProfileScreen({ user, onSignOut, onUpdateUser }: ProfileScreenProps) {
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : user.theme === "dark"
  )
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AVATAR_STYLE_KEY) ?? "initials"
    }
    return "initials"
  })

  const handleStyleSelect = (styleId: string) => {
    setAvatarStyle(styleId)
    localStorage.setItem(AVATAR_STYLE_KEY, styleId)
  }

  const handleThemeToggle = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    const theme = next ? "dark" : "light"
    if (next) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("tickfeed-theme", theme)
    onUpdateUser({ theme })
  }

  const initials = useMemo(() => {
    const f = user.firstName ?? ""
    const l = user.lastName ?? ""
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || "?"
  }, [user.firstName, user.lastName])

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
    },
  })

  // Sync form when user changes
  useEffect(() => {
    form.reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
    })
  }, [user, form])

  const handleSave = async (values: EditFormValues) => {
    setSaving(true)
    try {
      const result = await onUpdateUser({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      })
      if ("error" in result) {
        if (result.field === "username") {
          form.setError("username", { message: result.error })
        } else {
          toast({ title: "Update failed", description: result.error })
        }
        return
      }
      toast({ title: "Profile updated" })
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background px-4 pb-2 pt-4">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Profile card */}
        <div className="mx-4 mt-2 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-primary/30">
              {avatarStyle !== "initials" && (
                <AvatarImage src={dicebearUrl(avatarStyle, user.username)} alt={initials} />
              )}
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">{user.firstName} {user.lastName}</h2>
              <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Premium</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="flex-shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Watchlist preview */}
        <div className="mx-4 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Your Watchlist</h3>
            <button className="text-sm font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WATCHLIST_PREVIEW.map((stock) => (
              <div
                key={stock.symbol}
                className="cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
              >
                <span className="text-sm font-medium text-foreground">{stock.symbol}</span>
                <span className={`ml-2 text-xs font-medium ${stock.isPositive ? "text-gain" : "text-loss"}`}>{stock.change}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">24</div>
            <div className="text-xs text-muted-foreground">Articles Read</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">6</div>
            <div className="text-xs text-muted-foreground">Stocks</div>
          </div>
        </div>

        {/* Dark mode toggle */}
        <div className="mx-4 mt-6">
          <button
            onClick={handleThemeToggle}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                {isDarkMode ? <Moon className="h-5 w-5 text-foreground" /> : <Sun className="h-5 w-5 text-foreground" />}
              </div>
              <div className="text-left">
                <span className="font-medium text-foreground">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                <p className="text-xs text-muted-foreground">Tap to toggle theme</p>
              </div>
            </div>
            <div className={`relative h-6 w-12 rounded-full transition-colors ${isDarkMode ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${isDarkMode ? "left-7" : "left-1"}`} />
            </div>
          </button>
        </div>

        {/* Menu items */}
        <div className="mx-4 mt-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.hasArrow ? <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" /> : null}
              </button>
            )
          })}
        </div>

        {/* Sign out */}
        <div className="mx-4 mt-4">
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">TickFeed v1.0.0</p>
        </div>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10 pt-5">
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="text-lg">Edit Profile</SheetTitle>
          </SheetHeader>

          {/* Avatar style picker */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20 border-2 border-border">
              {avatarStyle !== "initials" && (
                <AvatarImage src={dicebearUrl(avatarStyle, user.username)} alt={initials} />
              )}
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">Choose your avatar style</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              {AVATAR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleSelect(style.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                    avatarStyle === style.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                    {style.id === "initials" ? (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                        {initials}
                      </div>
                    ) : (
                      <img src={dicebearUrl(style.id, user.username)} alt={style.label} className="h-full w-full" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">First name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-muted/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Last name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-muted/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">Username</FormLabel>
                    <FormControl>
                      <div className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-3 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                        <span className="select-none pr-1 text-sm font-medium text-muted-foreground">@</span>
                        <Input
                          {...field}
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="mt-2 h-12 w-full rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
