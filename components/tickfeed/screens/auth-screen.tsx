"use client"

import { useEffect } from "react"
import { Loader2, Mail, Zap, BarChart2, Users, Bell, BookOpen, TrendingUp, MessageSquare } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGoogleLogin } from "@react-oauth/google"
import { isNative } from "@/lib/native"

// Extracted so useGoogleLogin (which requires GoogleOAuthProvider context) is
// never called on native — GoogleOAuthProvider is skipped there to prevent
// the GSI script from loading and triggering a Chrome redirect.
function WebGoogleButton({
  onSuccess,
  onError,
  isSubmitting,
}: {
  onSuccess: (token: string, tokenType: 'access_token' | 'id_token') => Promise<void>
  onError: () => void
  isSubmitting: boolean
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: (res) => void onSuccess(res.access_token, 'access_token'),
    onError,
  })
  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={isSubmitting}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-white px-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
    >
      <GoogleIcon />
      <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import type { AuthStep, NewUserProfile } from "@/lib/auth"

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
})

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, or underscores only"),
})

type EmailFormValues = z.infer<typeof emailSchema>
type OtpFormValues = z.infer<typeof otpSchema>
type ProfileFormValues = z.infer<typeof profileSchema>

interface AuthScreenProps {
  step: Exclude<AuthStep, "authenticated">
  email: string
  isSubmitting: boolean
  onGoogleSuccess: (token: string, tokenType: 'access_token' | 'id_token') => Promise<void>
  onGoogleError: () => void
  onSubmitEmail: (email: string) => Promise<void>
  onSubmitOtp: (otp: string) => Promise<void>
  onSubmitProfile: (profile: NewUserProfile) => Promise<void>
  onBackToMethod: () => void
  onResendOtp: () => Promise<void>
}

export function AuthScreen({
  step,
  email,
  isSubmitting,
  onGoogleSuccess,
  onGoogleError,
  onSubmitEmail,
  onSubmitOtp,
  onSubmitProfile,
  onBackToMethod,
  onResendOtp,
}: AuthScreenProps) {
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email },
  })

  useEffect(() => {
    emailForm.reset({ email })
  }, [email, emailForm])

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", username: "" },
  })

  async function handleNativeGooglePress() {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      await GoogleAuth.initialize()
      const user = await GoogleAuth.signIn()
      await onGoogleSuccess(user.authentication.idToken, 'id_token')
    } catch {
      onGoogleError()
    }
  }

  const heading = (() => {
    if (step === "email") return { title: "Sign in with email", description: "We'll send a one-time code — no password needed." }
    if (step === "otp")   return { title: "Check your inbox",   description: `We sent a 6-digit code to ${email}` }
    if (step === "profile") return { title: "Finish your profile", description: "Set up your account before entering TickFeed." }
    return { title: "", description: "Market News. Smart Insights. In Your Feed." }
  })()

  const FEATURES = [
    { icon: Zap,            label: "AI-Powered Summaries"      },
    { icon: TrendingUp,     label: "NSE & BSE Live Updates"    },
    { icon: BarChart2,      label: "Market Digest"             },
    { icon: Bell,           label: "Watchlist Alerts"          },
    { icon: MessageSquare,  label: "Community Discussions"     },
    { icon: Zap,            label: "Zero Noise. Just Insights" },
    { icon: BookOpen,       label: "In-depth Analysis"         },
    { icon: Users,          label: "Follow Top Investors"      },
  ]

  return (
    <div className="safe-area-pt safe-area-pb relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.08),_transparent_32%)]" />

      <div className="relative flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-16 sm:px-6">
        <div>
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-foreground">Tick</span><span className="text-primary">Feed</span>
            </h1>
            {step === "method" || step === "email" ? (
              <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{heading.description}</p>
            ) : (
              <>
                <p className="mt-2.5 text-xl font-semibold text-foreground">{heading.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{heading.description}</p>
              </>
            )}
          </div>

          {/* Scrolling feature strip */}
          <div className="mb-5 overflow-hidden rounded-xl border border-border/30 bg-card/60 py-2.5 backdrop-blur-sm">
            <div
              className="flex w-max items-center"
              style={{ animation: "ticker 36s linear infinite" }}
            >
              {[...FEATURES, ...FEATURES].map((f, i) => (
                <span key={i} className="flex shrink-0 items-center gap-1.5 px-4">
                  <f.icon className="h-3 w-3 shrink-0 text-primary" />
                  <span className="text-xs font-medium tracking-wide text-foreground/70">{f.label}</span>
                  <span className="ml-3 text-border/40 select-none">·</span>
                </span>
              ))}
            </div>
          </div>

          <Card className="border-border/70 bg-card/80 py-0 backdrop-blur-xl">
            <CardHeader className="px-5 pb-0 pt-5">
              <CardTitle className="text-lg">
                {step === "profile" ? "Account setup" : "Login"}
              </CardTitle>
              <CardDescription>
                {(step === "method" || step === "email") && "Sign in with Google or enter your email below."}
                {step === "otp" && "The code is valid for 5 minutes."}
                {step === "profile" && "This information will appear on your TickFeed profile."}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-5 pb-5 pt-5">
              {(step === "method" || step === "email") && (
                <div className="space-y-4">
                  {/* Google button — native uses Capacitor, web uses OAuth popup */}
                  {isNative() ? (
                    <button
                      type="button"
                      onClick={() => void handleNativeGooglePress()}
                      disabled={isSubmitting}
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-white px-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                    >
                      <GoogleIcon />
                      <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
                    </button>
                  ) : (
                    <WebGoogleButton
                      onSuccess={onGoogleSuccess}
                      onError={onGoogleError}
                      isSubmitting={isSubmitting}
                    />
                  )}

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Email input inline */}
                  <Form {...emailForm}>
                    <form
                      className="space-y-3"
                      onSubmit={emailForm.handleSubmit(async (values) => {
                        await onSubmitEmail(values.email.trim().toLowerCase())
                      })}
                    >
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="Enter your email address"
                                className="h-12 rounded-xl bg-background/70"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        Send code
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {step === "otp" && (
                <Form {...otpForm}>
                  <form
                    className="space-y-5"
                    onSubmit={otpForm.handleSubmit(async (values) => {
                      await onSubmitOtp(values.otp)
                    })}
                  >
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification code</FormLabel>
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              containerClassName="justify-between"
                            >
                              <InputOTPGroup className="w-full justify-between">
                                {Array.from({ length: 6 }, (_, index) => (
                                  <InputOTPSlot
                                    key={index}
                                    index={index}
                                    className="h-12 w-12 rounded-xl border text-base first:rounded-xl first:border last:rounded-xl"
                                  />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <button
                        type="button"
                        onClick={onBackToMethod}
                        className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                        disabled={isSubmitting}
                      >
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={onResendOtp}
                        className="font-medium text-primary transition-colors hover:text-primary/80"
                        disabled={isSubmitting}
                      >
                        Resend code
                      </button>
                    </div>

                    <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Verify and continue
                    </Button>
                  </form>
                </Form>
              )}

              {step === "profile" && (
                <Form {...profileForm}>
                  <form
                    className="space-y-4"
                    onSubmit={profileForm.handleSubmit(async (values) => {
                      await onSubmitProfile(values)
                    })}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rahul" className="h-12 rounded-xl bg-background/70" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Sharma" className="h-12 rounded-xl bg-background/70" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="flex items-center rounded-xl border border-border bg-background/70 px-3 shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                              <span className="pr-2 text-sm font-medium text-muted-foreground">@</span>
                              <Input
                                {...field}
                                autoCapitalize="none"
                                autoCorrect="off"
                                placeholder="rahulsharma"
                                className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                onChange={(event) =>
                                  field.onChange(event.target.value.toLowerCase().replace(/\s+/g, ""))
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Complete setup
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="mt-auto pt-8 text-center text-xs leading-5 text-muted-foreground">
          For informational use only. Not SEBI-registered investment advice.
        </p>
      </div>
    </div>
  )
}
