import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppUser } from '../../types'
import { authService, startDemoSession } from '../../services/authService'
import { isFirebaseConfigured, missingFirebaseVariables } from '../../lib/firebase'
import { useProfileStore } from '../../store/useProfileStore'
import { useActivityStore } from '../../store/useActivityStore'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  configured: boolean
  missingVariables: string[]
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
  enterDemo: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const hydrate = useProfileStore((s) => s.hydrate)
  const clearProfile = useProfileStore((s) => s.clear)
  const hydrateActivity = useActivityStore((s) => s.hydrate)
  const clearActivity = useActivityStore((s) => s.clear)
  const lastUid = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (nextUser) {
        if (lastUid.current !== nextUser.uid) {
          void hydrate(nextUser.uid, {
            cloud: !nextUser.isDemo,
            email: nextUser.email,
            displayName: nextUser.displayName,
            photoURL: nextUser.photoURL,
          })
          void hydrateActivity(nextUser.uid, { cloud: !nextUser.isDemo })
        }
        lastUid.current = nextUser.uid
      } else {
        lastUid.current = null
        clearProfile()
        clearActivity()
      }
    })
    return unsubscribe
  }, [hydrate, clearProfile, hydrateActivity, clearActivity])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await authService.signIn(email, password)
    setUser(next)
    void hydrate(next.uid, {
      cloud: !next.isDemo,
      email: next.email,
      displayName: next.displayName,
      photoURL: next.photoURL,
    })
    void hydrateActivity(next.uid, { cloud: !next.isDemo })
    lastUid.current = next.uid
  }, [hydrate, hydrateActivity])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const next = await authService.signUp(name, email, password)
    setUser(next)
    void hydrate(next.uid, {
      cloud: !next.isDemo,
      email: next.email,
      displayName: next.displayName,
      photoURL: next.photoURL,
    })
    void hydrateActivity(next.uid, { cloud: !next.isDemo })
    lastUid.current = next.uid
  }, [hydrate, hydrateActivity])

  const signInWithGoogle = useCallback(async () => {
    const next = await authService.signInWithGoogle()
    setUser(next)
    void hydrate(next.uid, {
      cloud: !next.isDemo,
      email: next.email,
      displayName: next.displayName,
      photoURL: next.photoURL,
    })
    void hydrateActivity(next.uid, { cloud: !next.isDemo })
    lastUid.current = next.uid
  }, [hydrate, hydrateActivity])

  const sendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email)
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
    clearProfile()
    clearActivity()
    lastUid.current = null
  }, [clearProfile, clearActivity])

  const enterDemo = useCallback(() => {
    const demo = startDemoSession()
    setUser(demo)
    void hydrate(demo.uid, { cloud: false, email: demo.email, displayName: demo.displayName })
    void hydrateActivity(demo.uid, { cloud: false })
    lastUid.current = demo.uid
  }, [hydrate, hydrateActivity])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      missingVariables: missingFirebaseVariables,
      signIn,
      signUp,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      enterDemo,
    }),
    [user, loading, signIn, signUp, signInWithGoogle, sendPasswordReset, signOut, enterDemo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
