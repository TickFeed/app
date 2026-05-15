export type AuthStep = 'phone' | 'otp' | 'profile' | 'authenticated'

export interface AuthUser {
  id: string
  phone: string
  firstName: string
  lastName: string
  username: string
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

export type RequestOtpResult = {
  status: 'otp-sent'
  phone: string
  codeLength: number
}

export type VerifyOtpResult =
  | {
      status: 'existing-user'
      user: AuthUser
      session: AuthSession
    }
  | {
      status: 'new-user'
      phone: string
      registrationToken: string
    }
  | {
      status: 'error'
      message: string
    }

export type CompleteProfileResult =
  | {
      status: 'authenticated'
      user: AuthUser
      session: AuthSession
    }
  | {
      status: 'error'
      message: string
      field?: 'username'
    }

const SESSION_STORAGE_KEY = 'tickfeed-auth-session'
const USERS_STORAGE_KEY = 'tickfeed-registered-users'
export const DEMO_OTP = '123456'

const SEEDED_USERS: AuthUser[] = [
  {
    id: 'user_rahul_sharma',
    phone: '9876543210',
    firstName: 'Rahul',
    lastName: 'Sharma',
    username: 'rahulsharma',
  },
  {
    id: 'user_priya_patel',
    phone: '9123456789',
    firstName: 'Priya',
    lastName: 'Patel',
    username: 'priyapatel',
  },
]

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildSession(user: AuthUser): AuthSession {
  return {
    token: `session_${user.id}_${Date.now()}`,
    user,
  }
}

function readRegisteredUsers() {
  if (!canUseStorage()) {
    return SEEDED_USERS
  }

  const rawUsers = window.localStorage.getItem(USERS_STORAGE_KEY)

  if (!rawUsers) {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEEDED_USERS))
    return SEEDED_USERS
  }

  try {
    const parsedUsers = JSON.parse(rawUsers)

    if (!Array.isArray(parsedUsers)) {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEEDED_USERS))
      return SEEDED_USERS
    }

    return parsedUsers as AuthUser[]
  } catch {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEEDED_USERS))
    return SEEDED_USERS
  }
}

function writeRegisteredUsers(users: AuthUser[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

export function normalizePhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, '')

  if (digitsOnly.length > 10) {
    return digitsOnly.slice(-10)
  }

  return digitsOnly
}

export function loadAuthSession() {
  if (!canUseStorage()) {
    return null
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function persistAuthSession(session: AuthSession) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const normalizedPhone = normalizePhone(phone)

  await wait(500)

  return {
    status: 'otp-sent',
    phone: normalizedPhone,
    codeLength: DEMO_OTP.length,
  }
}

export async function verifyOtp({
  phone,
  otp,
}: {
  phone: string
  otp: string
}): Promise<VerifyOtpResult> {
  await wait(700)

  if (otp !== DEMO_OTP) {
    return {
      status: 'error',
      message: 'Invalid verification code. Try 123456 for the prototype.',
    }
  }

  const normalizedPhone = normalizePhone(phone)
  const existingUser = readRegisteredUsers().find((user) => user.phone === normalizedPhone)

  if (existingUser) {
    return {
      status: 'existing-user',
      user: existingUser,
      session: buildSession(existingUser),
    }
  }

  return {
    status: 'new-user',
    phone: normalizedPhone,
    registrationToken: `registration_${normalizedPhone}`,
  }
}

export async function completeProfile({
  phone,
  registrationToken,
  profile,
}: {
  phone: string
  registrationToken: string
  profile: NewUserProfile
}): Promise<CompleteProfileResult> {
  await wait(700)

  const normalizedPhone = normalizePhone(phone)

  if (registrationToken !== `registration_${normalizedPhone}`) {
    return {
      status: 'error',
      message: 'Your signup session expired. Please verify your phone again.',
    }
  }

  const registeredUsers = readRegisteredUsers()
  const normalizedUsername = profile.username.trim().toLowerCase()

  if (registeredUsers.some((user) => user.username.toLowerCase() === normalizedUsername)) {
    return {
      status: 'error',
      field: 'username',
      message: 'That username is already taken.',
    }
  }

  const newUser: AuthUser = {
    id: `user_${normalizedPhone}`,
    phone: normalizedPhone,
    firstName: profile.firstName.trim(),
    lastName: profile.lastName.trim(),
    username: normalizedUsername,
  }

  writeRegisteredUsers([...registeredUsers, newUser])

  return {
    status: 'authenticated',
    user: newUser,
    session: buildSession(newUser),
  }
}
