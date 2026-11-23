import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Brain, Menu, ScanFace, X } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { buttonClasses } from '../../components/ui/Button'
import { NAV_ITEMS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { RollingText } from '../motion/RollingText'

const sectionIds = ['home', 'programs', 'how-it-works', 'about', 'contact']

export function PublicNavbar({ forceSolid = false }: { forceSolid?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY.current
      setScrolled(y > 24)

      // Reference behaviour: the bar leaves while reading downward and
      // returns as soon as the user scrolls back up.
      if (open || forceSolid || y < 140) {
        setHidden(false)
      } else if (delta > 5) {
        setHidden(true)
      } else if (delta < -5) {
        setHidden(false)
      }
      lastScrollY.current = y

      const marker = window.scrollY + window.innerHeight * 0.33
      let current = ''
      for (const id of sectionIds) {
        const element = document.getElementById(id)
        if (element && element.offsetTop <= marker && element.offsetTop + element.offsetHeight > marker) {
          current = id
        }
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [forceSolid, open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  const handleNav = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const [path, hash] = href.split('#')
    if (path !== '/' || location.pathname !== '/') {
      event.preventDefault()
      navigate(href)
      window.setTimeout(() => {
        if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 80)
      return
    }
    if (hash) {
      event.preventDefault()
      const el = document.getElementById(hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `/#${hash}`)
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50" onFocusCapture={() => setHidden(false)}>
      <motion.div
        initial={reduceMotion ? false : { y: -110, opacity: 0 }}
        animate={{ y: hidden ? '-105%' : 0, opacity: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : hidden
              ? { duration: 0.42, ease: [0.4, 0, 1, 1] }
              : { type: 'spring', stiffness: 320, damping: 40, mass: 0.85 }
        }
      >
      <div
        className={cn(
          'hidden overflow-hidden border-b border-white/10 bg-charcoal text-white/70 transition-all duration-500 lg:block',
          scrolled ? 'max-h-0 border-transparent opacity-0' : 'max-h-12 opacity-100',
        )}
      >
        <div className="container-forge flex h-10 items-center justify-between text-[11px]">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-orange-500" />
              Personal fitness workspace · web app
            </span>
            <span className="hidden text-white/30 xl:inline">|</span>
            <span className="hidden text-white/50 xl:inline">On-device AI · no install</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/#studio" className="inline-flex items-center gap-1.5 hover:text-white">
              <Brain className="h-3 w-3" aria-hidden="true" /> AI Plan
            </a>
            <a href="/#studio" className="inline-flex items-center gap-1.5 hover:text-white">
              <ScanFace className="h-3 w-3" aria-hidden="true" /> Form Coach
            </a>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border-b transition-all duration-300',
          scrolled || forceSolid
            ? 'border-white/10 bg-charcoal/95 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl'
            : 'border-white/10 bg-gradient-to-b from-charcoal/70 to-transparent',
        )}
      >
        <div className="container-forge flex h-[68px] items-center justify-between gap-4">
          <Link to="/" aria-label="Forge Athletic home" className="shrink-0">
            <Logo variant="light" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const id = item.href.split('#')[1] ?? 'home'
              const isActive = active === id
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => handleNav(event, item.href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group/roll relative inline-flex h-10 items-center px-3.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors',
                    isActive ? 'text-white' : 'text-white/60 hover:text-white',
                  )}
                >
                  <RollingText>{item.label}</RollingText>
                  <span
                    className={cn(
                      'absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-orange-500 transition-transform duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                  />
                </a>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/login"
              className="group/roll inline-flex min-h-[44px] items-center px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-white"
            >
              <RollingText>Log in</RollingText>
            </Link>
            <Link to="/signup" className={buttonClasses('primary', 'sm', 'group/roll hidden sm:inline-flex')}>
              <RollingText>Get Started</RollingText>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 top-[68px] z-40 overflow-y-auto bg-charcoal lg:hidden"
          >
            <div className="container-forge flex min-h-full flex-col py-6">
              <nav className="flex flex-col divide-y divide-white/10" aria-label="Mobile primary">
                {NAV_ITEMS.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(event) => {
                      handleNav(event, item.href)
                      setOpen(false)
                    }}
                    className="group group/roll flex min-h-[64px] items-center justify-between py-4"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-orange-500">
                        0{index + 1}
                      </span>
                      <span className="font-display text-3xl uppercase text-white transition-colors group-hover:text-orange-400">
                        <RollingText>{item.label}</RollingText>
                      </span>
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-white/30 transition-colors group-hover:text-orange-400" />
                  </a>
                ))}
              </nav>
              <div className="mt-8 space-y-3">
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className={buttonClasses('primary', 'default', 'group/roll w-full')}
                >
                  <RollingText>Get Started</RollingText> <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={buttonClasses('outline-light', 'default', 'group/roll w-full')}
                >
                  <RollingText>Log in</RollingText>
                </Link>
              </div>
              <div className="mt-auto pt-10">
                <div className="space-y-2 text-sm text-white/55">
                  <a href="/#studio" className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-orange-500" /> AI workout plan
                  </a>
                  <a href="/#studio" className="flex items-center gap-2">
                    <ScanFace className="h-4 w-4 text-orange-500" /> Camera form coach
                  </a>
                </div>
                <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/30">
                  Browser-based · no install required
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
