import { useEffect, useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { DashboardSidebar } from '../components/layout/DashboardSidebar'
import { DashboardTopbar } from '../components/layout/DashboardTopbar'
import { MobileBottomNav } from '../components/layout/MobileBottomNav'
import { useProfileStore } from '../store/useProfileStore'
import { useAuth } from '../features/auth/AuthContext'
import { FullScreenLoader } from '../components/layout/RouteGuards'

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profile = useProfileStore((s) => s.profile)
  const hydrated = useProfileStore((s) => s.hydrated)
  const { user } = useAuth()
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
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
        <footer className="hidden border-t border-charcoal/10 px-8 py-4 text-[10px] text-charcoal/35 lg:flex lg:items-center lg:justify-between">
          <span>Forge Athletic Co. · Demo workspace</span>
          <span>Workouts, meals and recovery are saved locally. Profile missions persist separately.</span>
        </footer>
      </div>

      <MobileBottomNav />
    </div>
  )
}
