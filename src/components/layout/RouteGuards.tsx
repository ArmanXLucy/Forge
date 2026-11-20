import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore } from '../../store/useProfileStore'
import { Logo } from '../ui/Logo'

export function FullScreenLoader({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory">
      <Logo />
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-charcoal/40">
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
        {label}
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader label="Checking your session…" />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const hydrated = useProfileStore((s) => s.hydrated)

  if (!hydrated) return <FullScreenLoader />
  if (user && !profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
