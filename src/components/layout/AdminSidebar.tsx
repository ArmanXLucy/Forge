import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { adminNavGroups } from '../navigation/adminNav'
import { useAuth } from '../../features/auth/AuthContext'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { hasPermission, roleLabel } from '../../features/admin/access'
import { cn } from '../../lib/utils'

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth()
  const { admin } = useAdminAccess()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col bg-charcoal text-white">
      <div className="px-5 pb-4 pt-6">
        <Link to="/admin/overview" onClick={onNavigate} aria-label="Forge Athletic admin">
          <Logo variant="light" />
        </Link>
        <p className="mt-2.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
          Admin workspace
        </p>
      </div>

      <div className="mx-4 mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            <ShieldIcon />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
              {admin?.name ?? 'Administrator'}
            </p>
            <p className="truncate text-[9px] uppercase tracking-[0.12em] text-orange-400/75">
              {admin ? roleLabel(admin.role) : 'Verifying access'}
            </p>
          </div>
        </div>
      </div>

      <nav
        className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
        aria-label="Admin navigation"
      >
        {adminNavGroups.map((group) => {
          const items = group.items.filter((item) => hasPermission(admin, item.permission))
          if (!items.length) return null
          return (
            <div key={group.label}>
              <p className="px-3 pb-2 pt-4 text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex min-h-[38px] items-center gap-3 rounded-lg px-3 text-[11.5px] font-medium transition-colors',
                          isActive
                            ? 'bg-white/[0.07] text-white'
                            : 'text-white/50 hover:bg-white/[0.04] hover:text-white/85',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-orange-500 transition-opacity',
                              isActive ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <item.icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-orange-500' : 'text-white/35 group-hover:text-white/70',
                            )}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="mx-2 mt-4 flex min-h-[38px] items-center gap-3 rounded-lg border border-white/8 px-3 text-[10.5px] font-medium text-white/40 transition-colors hover:border-orange-500/25 hover:bg-orange-500/[0.05] hover:text-white/75"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-orange-400/80" />
          User dashboard
        </Link>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar
            name={admin?.name ?? 'Administrator'}
            className="h-9 w-9 border border-white/10 text-[11px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-white">
              {admin?.name ?? 'Administrator'}
            </p>
            <p className="truncate text-[10px] text-white/35">{admin?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Log out of admin workspace"
            title="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 9.7 4.1-1.4 7-5.3 7-9.7V6l-7-3Z" />
      <path d="m9.4 11.8 1.7 1.7 3.5-3.6" />
    </svg>
  )
}
