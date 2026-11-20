import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LifeBuoy, LogOut, Sparkles } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { dashboardNav, dashboardSecondary } from '../../components/navigation/dashboardNav'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { cn, initials } from '../../lib/utils'
import { GOAL_LABELS } from '../../lib/constants'

interface DashboardSidebarProps {
  onNavigate?: () => void
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const { user, signOut } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const { completion, xp } = useProfileStats()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col bg-charcoal text-white">
      <div className="px-5 pb-4 pt-6">
        <Link to="/dashboard" onClick={onNavigate} aria-label="Forge Athletic dashboard">
          <Logo variant="light" />
        </Link>
        <p className="mt-2.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
          Performance workspace
        </p>
      </div>

      <div className="mx-4 mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
            Profile completion
          </span>
          <span className="text-[11px] font-bold text-orange-400">{completion}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-white/30">
          <span>{profile ? GOAL_LABELS[profile.goal] : 'Quick Start pending'}</span>
          <span className="inline-flex items-center gap-1 text-orange-400/80">
            <Sparkles className="h-2.5 w-2.5" /> {xp} XP
          </span>
        </div>
      </div>

      <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" aria-label="Dashboard">
        <p className="px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {dashboardNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-[12px] font-medium transition-colors',
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
                        'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-orange-500 transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-orange-500' : 'text-white/35 group-hover:text-white/70',
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-orange-400">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="px-3 pb-2 pt-5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">
          Account
        </p>
        <ul className="space-y-0.5">
          {dashboardSecondary.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.07] text-white'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/85',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-orange-500' : 'text-white/35 group-hover:text-white/70',
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <a
          href="mailto:hello@forge-athletic.ch"
          className="sidebar-optional mx-2 mt-3 flex min-h-[42px] items-center gap-3 rounded-lg border border-white/8 px-3 text-[11px] font-medium text-white/40 transition-colors hover:border-orange-500/25 hover:bg-orange-500/[0.05] hover:text-white/75"
        >
          <LifeBuoy className="h-4 w-4 shrink-0 text-orange-400/80" />
          <span className="flex-1">Coach support</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
        </a>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[11px] font-bold text-orange-400">
            {initials(profile?.name ?? user?.displayName ?? 'Athlete')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white">
              {profile?.name ?? user?.displayName ?? 'Athlete'}
            </p>
            <p className="truncate text-[10px] text-white/35">
              {user?.isDemo ? 'Demo workspace' : user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Log out"
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
