export type AuthStep = 'method' | 'email' | 'otp' | 'profile' | 'authenticated'

export type AvatarStyle = "initials" | "micah" | "personas" | "notionists-neutral" | "lorelei-neutral" | "shapes"

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  theme: 'light' | 'dark'
  avatarStyle: AvatarStyle
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export interface NewUserProfile {
  firstName: string
  lastName: string
  username: string
}

export type GoogleSignInResult =
  | { status: 'authenticated'; user: AuthUser; session: AuthSession }
  | { status: 'error'; message: string }

export type RequestEmailOtpResult = {
  status: 'otp-sent'
  email: string
}

export type VerifyEmailOtpResult =
  | { status: 'existing-user'; user: AuthUser; session: AuthSession }
  | { status: 'new-user'; email: string; registrationToken: string }
  | { status: 'error'; message: string }

export type CompleteProfileResult =
  | { status: 'authenticated'; user: AuthUser; session: AuthSession }
  | { status: 'error'; message: string; field?: 'username' }

const SESSION_STORAGE_KEY = 'tickfeed-auth-session'

/** Keys that are no longer used and should be pruned automatically. */
const STALE_KEYS = ['tickfeed-registered-users', 'tickfeed-avatar-color', 'tickfeed-avatar-style']

/** All keys owned by this app (cleared on sign-out). */
const APP_KEYS = [SESSION_STORAGE_KEY, 'tickfeed-theme']

/** Avatar style localStorage key — now stored server-side; keep in STALE_KEYS to prune. */
// 'tickfeed-avatar-style' is intentionally omitted — avatar is persisted in the user profile.

/** Call once on app boot to remove orphaned keys from old versions. */
export function pruneStaleStorage(): void {
  if (!canUseStorage()) return
  for (const key of STALE_KEYS) {
    window.localStorage.removeItem(key)
  }
}

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

const VALID_AVATAR_STYLES: AvatarStyle[] = ["initials", "micah", "personas", "notionists-neutral", "lorelei-neutral", "shapes"]

function mapUser(raw: Record<string, unknown>): AuthUser {
  const rawStyle = (raw.avatarStyle ?? raw.avatar_style) as string | undefined
  return {
    id: String(raw.id),
    email: (raw.email as string) ?? "",
    firstName: (raw.first_name as string) ?? (raw.firstName as string) ?? "",
    lastName: (raw.last_name as string) ?? (raw.lastName as string) ?? "",
    username: (raw.username as string) ?? "",
    theme: ((raw.theme as string) === 'dark' ? 'dark' : 'light'),
    avatarStyle: (VALID_AVATAR_STYLES.includes(rawStyle as AvatarStyle) ? rawStyle : 'initials') as AvatarStyle,
  }
}

export function loadAuthSession(): AuthSession | null {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as AuthSession
    // Discard stale sessions that are missing a valid token
    if (!session?.token || typeof session.token !== "string") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function persistAuthSession(session: AuthSession): void {
  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  }
}

export function clearAuthSession(): void {
  if (!canUseStorage()) return
  for (const key of APP_KEYS) {
    window.localStorage.removeItem(key)
  }
}

export async function signInWithGoogle(token: string, tokenType: 'access_token' | 'id_token' = 'access_token'): Promise<GoogleSignInResult> {
  try {
    const data = await apiPost<{
      token: string
      user: Record<string, unknown>
      is_new_user: boolean
    }>('/api/auth/google', tokenType === 'id_token' ? { id_token: token } : { access_token: token })

    const user = mapUser(data.user)
    return { status: 'authenticated', user, session: { token: data.token, user } }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Google sign-in failed' }
  }
}

export async function requestEmailOtp(email: string): Promise<RequestEmailOtpResult> {
  await apiPost('/api/auth/email/otp/request', { email: email.toLowerCase().trim() })
  return { status: 'otp-sent', email: email.toLowerCase().trim() }
}

export async function verifyEmailOtp(email: string, otp: string): Promise<VerifyEmailOtpResult> {
  try {
    const data = await apiPost<{
      status: string
      token?: string
      user?: Record<string, unknown>
      registration_token?: string
      message?: string
    }>('/api/auth/email/otp/verify', { email, otp })

    if (data.status === 'existing-user' && data.token && data.user) {
      const user = mapUser(data.user)
      return { status: 'existing-user', user, session: { token: data.token, user } }
    }

    if (data.status === 'new-user' && data.registration_token) {
      return { status: 'new-user', email, registrationToken: data.registration_token }
    }

    return { status: 'error', message: data.message ?? 'Unexpected response from server' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Verification failed' }
  }
}

export async function updateProfile(
  token: string,
  fields: { firstName?: string; lastName?: string; username?: string; theme?: 'light' | 'dark'; avatarStyle?: AvatarStyle }
): Promise<{ user: AuthUser } | { error: string; field?: 'username' }> {
  try {
    const res = await fetch(`${API_BASE}/api/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        first_name: fields.firstName,
        last_name: fields.lastName,
        username: fields.username,
        theme: fields.theme,
        avatar_style: fields.avatarStyle,
      }),
    })
    if (res.status === 409) return { error: 'That username is already taken.', field: 'username' }
    if (res.status === 401) return { error: 'session_expired' }
    if (res.status === 503) return { error: 'Server is temporarily unavailable. Please try again.' }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err?.detail || 'Update failed' }
    }
    const data = await res.json()
    return { user: mapUser(data) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function completeProfile({
  email,
  registrationToken,
  profile,
}: {
  email: string
  registrationToken: string
  profile: NewUserProfile
}): Promise<CompleteProfileResult> {
  try {
    const data = await apiPost<{
      status: string
      token?: string
      user?: Record<string, unknown>
      message?: string
      field?: 'username'
    }>('/api/auth/profile/complete', {
      email,
      registration_token: registrationToken,
      first_name: profile.firstName,
      last_name: profile.lastName,
      username: profile.username,
    })

    if (data.status === 'authenticated' && data.token && data.user) {
      const user = mapUser(data.user)
      return { status: 'authenticated', user, session: { token: data.token, user } }
    }

    return { status: 'error', message: data.message ?? 'Signup failed', field: data.field }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Signup failed',
    }
  }
}
