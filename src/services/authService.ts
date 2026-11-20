import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'
import type { AppUser } from '../types'

const DEMO_SESSION_KEY = 'forge:demo-session:v1'

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthConfigurationError'
  }
}

export class FriendlyAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FriendlyAuthError'
  }
}

function requireAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new AuthConfigurationError(
      'Firebase is not configured yet. Add your credentials to the local .env file, then restart the dev server. You can still explore the dashboard in demo mode.',
    )
  }
  return auth
}

export function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isDemo: false,
  }
}

function demoUser(): AppUser {
  return {
    uid: 'demo-athlete',
    email: 'demo@forge-athletic.local',
    displayName: 'Alex Morgan',
    photoURL: null,
    isDemo: true,
  }
}

export function getDemoSession(): AppUser | null {
  try {
    return localStorage.getItem(DEMO_SESSION_KEY) ? demoUser() : null
  } catch {
    return null
  }
}

export function startDemoSession(): AppUser {
  try {
    localStorage.setItem(DEMO_SESSION_KEY, 'active')
  } catch {
    // Ignore storage failures — the session still works for this tab.
  }
  return demoUser()
}

export function clearDemoSession() {
  try {
    localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    // Ignore.
  }
}

export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look valid.'
    case 'auth/missing-password':
      return 'Please enter your password.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.'
    case 'auth/weak-password':
      return 'Choose a stronger password — at least 8 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before it completed.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in pop-up. Allow pop-ups and retry.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in your Firebase project.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised in Firebase Authentication settings.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return (error as Error)?.message?.replace('Firebase: ', '') ?? 'Something went wrong. Please try again.'
  }
}

export const authService = {
  configured: isFirebaseConfigured,

  subscribe(callback: (user: AppUser | null) => void) {
    if (!isFirebaseConfigured || !auth) {
      callback(getDemoSession())
      return () => undefined
    }
    return onAuthStateChanged(auth, (user) => callback(user ? toAppUser(user) : null))
  },

  async signIn(email: string, password: string) {
    const instance = requireAuth()
    try {
      const result = await signInWithEmailAndPassword(instance, email, password)
      return toAppUser(result.user)
    } catch (error) {
      throw new FriendlyAuthError(mapAuthError(error))
    }
  },

  async signUp(name: string, email: string, password: string) {
    const instance = requireAuth()
    try {
      const result = await createUserWithEmailAndPassword(instance, email, password)
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() })
      }
      return {
        ...toAppUser(result.user),
        displayName: name.trim() || result.user.displayName,
      }
    } catch (error) {
      throw new FriendlyAuthError(mapAuthError(error))
    }
  },

  async signInWithGoogle() {
    const instance = requireAuth()
    if (!googleProvider) {
      throw new AuthConfigurationError('Google sign-in is unavailable until Firebase is configured.')
    }
    try {
      const result = await signInWithPopup(instance, googleProvider)
      return toAppUser(result.user)
    } catch (error) {
      throw new FriendlyAuthError(mapAuthError(error))
    }
  },

  async sendPasswordReset(email: string) {
    const instance = requireAuth()
    try {
      await sendPasswordResetEmail(instance, email)
    } catch (error) {
      throw new FriendlyAuthError(mapAuthError(error))
    }
  },

  async signOut() {
    clearDemoSession()
    if (isFirebaseConfigured && auth) {
      await signOut(auth)
    }
  },
}
