import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, LogOut, ShieldAlert, X } from 'lucide-react'
import { DashboardSidebar } from '../components/layout/DashboardSidebar'
import { DashboardTopbar } from '../components/layout/DashboardTopbar'
import { MobileBottomNav } from '../components/layout/MobileBottomNav'
import { useProfileStore } from '../store/useProfileStore'
import { useAuth } from '../features/auth/AuthContext'
import { FullScreenLoader } from '../components/layout/RouteGuards'
import { useDataStatus } from '../hooks/useDataStatus'

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profile = useProfileStore((s) => s.profile)
  const hydrated = useProfileStore((s) => s.hydrated)
  const accountStatus = useProfileStore((s) => s.accountStatus)
  const { user, signOut } = useAuth()
  const { isCloud, error } = useDataStatus()
  const location = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  if (!hydrated) return <FullScreenLoader />
  if (accountStatus === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal px-5">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white">
          <ShieldAlert className="h-8 w-8 text-orange-400" />
          <h1 className="mt-4 font-display text-3xl uppercase leading-none">Account suspended</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            This account has been suspended by an administrator. Open a support request after access
            is restored if you need help.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-orange-500 px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    )
  }
  if (user && !profile) return <Navigate to="/onboarding" replace />

  return (
    <div className="min-h-screen bg-ivory">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <DashboardSidebar />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[min(300px,85vw)] overflow-y-auto shadow-lift"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
              <DashboardSidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <DashboardTopbar onOpenMenu={() => setDrawerOpen(true)} />
        {error && !isCloud && (
          <div className="border-b border-amber-500/20 bg-amber-50 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1500px] items-start gap-2 text-[10px] leading-relaxed text-amber-900 sm:items-center">
              <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
              <p className="min-w-0 flex-1">
                Cloud sync is unavailable. Changes are saved in this browser.{" "}
                <Link to="/dashboard/settings" className="font-semibold underline underline-offset-2">
                  View connection details
                </Link>
                .
              </p>
            </div>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
        <footer className="hidden border-t border-charcoal/10 px-8 py-4 text-[10px] text-charcoal/35 lg:flex lg:items-center lg:justify-between">
          <span>
            Forge Athletic Co. · {isCloud ? 'Cloud account' : user?.isDemo ? 'Demo workspace' : 'Local mode'}
          </span>
          <span>
            {isCloud
              ? 'Profile and activity records sync to Firestore with a local offline cache.'
              : 'Records are cached in this browser until Firestore is available.'}
          </span>
        </footer>
      </div>

      <MobileBottomNav />
    </div>
  )
}
