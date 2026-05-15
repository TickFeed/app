"use client"

import { useEffect, useMemo } from "react"
import { Loader2, LockKeyhole, MessageSquareText, Smartphone } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import type { AuthStep, NewUserProfile } from "@/lib/auth"
import { DEMO_OTP, normalizePhone } from "@/lib/auth"

const phoneSchema = z.object({
  phone: z
    .string()
    .refine((value) => normalizePhone(value).length === 10, "Enter a valid 10-digit mobile number"),
})

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
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

type PhoneFormValues = z.infer<typeof phoneSchema>
type OtpFormValues = z.infer<typeof otpSchema>
type ProfileFormValues = z.infer<typeof profileSchema>

interface AuthScreenProps {
  step: Exclude<AuthStep, "authenticated">
  phone: string
  isSubmitting: boolean
  onSubmitPhone: (phone: string) => Promise<void>
  onSubmitOtp: (otp: string) => Promise<void>
  onSubmitProfile: (profile: NewUserProfile) => Promise<void>
  onBackToPhone: () => void
  onResendOtp: () => Promise<void>
}

export function AuthScreen({
  step,
  phone,
  isSubmitting,
  onSubmitPhone,
  onSubmitOtp,
  onSubmitProfile,
  onBackToPhone,
  onResendOtp,
}: AuthScreenProps) {
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone,
    },
  })

  useEffect(() => {
    phoneForm.reset({ phone })
  }, [phone, phoneForm])

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
    },
  })

  const heading = useMemo(() => {
    if (step === "otp") {
      return {
        title: "Verify your number",
        description: `We sent a 6-digit code to +91 ${phone}`,
        icon: LockKeyhole,
      }
    }

    if (step === "profile") {
      return {
        title: "Finish your profile",
        description: "Set up your account before entering TickFeed.",
        icon: MessageSquareText,
      }
    }

    return {
      title: "Welcome to TickFeed",
      description: "Sign in with your mobile number to personalize your market feed.",
      icon: Smartphone,
    }
  }, [phone, step])

  const HeadingIcon = heading.icon

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.08),_transparent_32%)]" />

      <div className="relative flex flex-1 flex-col justify-between overflow-y-auto px-4 pb-6 pt-6 sm:px-6">
        <div>
          <div className="mb-8 px-1 pt-2">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <HeadingIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">TickFeed</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">{heading.title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{heading.description}</p>
          </div>

          <Card className="border-border/70 bg-card/80 py-0 backdrop-blur-xl">
            <CardHeader className="px-5 pb-0 pt-5">
              <CardTitle className="text-lg">{step === "profile" ? "Account setup" : "Secure access"}</CardTitle>
              <CardDescription>
                {step === "phone" && "Use your phone number to start the sign-in flow."}
                {step === "otp" && `Enter ${DEMO_OTP} to continue in this prototype.`}
                {step === "profile" && "This information will become the initial user profile payload for backend integration."}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-5 pb-5 pt-5">
              {step === "phone" && (
                <Form {...phoneForm}>
                  <form
                    className="space-y-5"
                    onSubmit={phoneForm.handleSubmit(async (values) => {
                      await onSubmitPhone(values.phone)
                    })}
                  >
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile number</FormLabel>
                          <FormControl>
                            <div className="flex items-center rounded-xl border border-border bg-background/70 px-3 shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
                              <span className="pr-2 text-sm font-medium text-muted-foreground">+91</span>
                              <Input
                                {...field}
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="98765 43210"
                                className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                onChange={(event) => field.onChange(normalizePhone(event.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continue
                    </Button>
                  </form>
                </Form>
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
                          <FormLabel>One-time password</FormLabel>
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              containerClassName="justify-between"
                            >
                              <InputOTPGroup className="w-full justify-between">
                                {Array.from({ length: 6 }, (_, index) => (
                                  <InputOTPSlot key={index} index={index} className="h-12 w-12 rounded-xl border text-base first:rounded-xl first:border last:rounded-xl" />
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
                        onClick={onBackToPhone}
                        className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                        disabled={isSubmitting}
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={onResendOtp}
                        className="font-medium text-primary transition-colors hover:text-primary/80"
                        disabled={isSubmitting}
                      >
                        Resend OTP
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
                                onChange={(event) => field.onChange(event.target.value.toLowerCase().replace(/\s+/g, ""))}
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

        <div className="mt-6 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-xs leading-5 text-muted-foreground backdrop-blur-sm">
          Prototype note: use <span className="font-semibold text-foreground">123456</span> as the OTP. Existing demo users include <span className="font-semibold text-foreground">9876543210</span> and <span className="font-semibold text-foreground">9123456789</span>.
        </div>
      </div>
    </div>
  )
}
