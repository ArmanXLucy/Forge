import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, LockKeyhole, LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { FullScreenLoader } from './RouteGuards'
import { buttonClasses } from '../ui/Button'
import type { AdminPermission } from '../../types/admin'
import { hasPermission } from '../../features/admin/access'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const access = useAdminAccess()

  if (loading || access.status === 'loading') {
    return <FullScreenLoader label="Verifying admin access…" />
  }
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }
  if (access.status !== 'admin' || !access.admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal px-5 py-16 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">
            Admin workspace
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase leading-none">Access denied</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {access.error ?? 'Your account is not authorised for the Forge Athletic admin workspace.'}
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/40">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
            Admin access is provisioned manually. Ask a Super Admin to add your Firebase UID to
            the adminUsers collection.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void signOut()}
              className={buttonClasses('primary', 'sm')}
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
            <Link to="/dashboard" className={buttonClasses('outline-light', 'sm')}>
              <ArrowLeft className="h-3.5 w-3.5" /> User dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export function RequireAdminPermission({
  permission,
  children,
}: {
  permission: AdminPermission
  children: ReactNode
}) {
  const { admin } = useAdminAccess()
  if (!hasPermission(admin, permission)) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-white p-8">
        <ShieldAlert className="h-8 w-8 text-orange-500" />
        <h1 className="mt-4 font-display text-3xl uppercase text-charcoal">Restricted area</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal/50">
          Your administrator role does not include access to this module. Ask a Super Admin if you
          need this permission.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
