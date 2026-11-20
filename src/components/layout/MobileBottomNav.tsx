import { NavLink } from 'react-router-dom'
import { Dumbbell, LayoutDashboard, LineChart, Sparkles, Target } from 'lucide-react'
import { cn } from '../../lib/utils'

const items = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Missions', to: '/dashboard/missions', icon: Target },
  { label: 'AI Coach', to: '/dashboard/ai-coach', icon: Sparkles },
  { label: 'Workouts', to: '/dashboard/workouts', icon: Dumbbell },
  { label: 'Progress', to: '/dashboard/progress', icon: LineChart },
]

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Dashboard quick navigation"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors',
                  isActive ? 'text-orange-600' : 'text-charcoal/40',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-9 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-orange-500/10',
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
