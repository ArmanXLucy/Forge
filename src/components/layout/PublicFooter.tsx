import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, Brain, ScanFace, ShieldCheck } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { RollingText } from '../motion/RollingText'

const exploreLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#programs' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'About', href: '/#about' },
  { label: 'FAQ', href: '/#faq' },
]

const platformLinks = [
  { label: 'AI Workout Plan', href: '/#programs' },
  { label: 'Form Coach', href: '/#programs' },
  { label: 'Guided Profile', href: '/#programs' },
  { label: 'Nutrition Log', href: '/#programs' },
  { label: 'Progress Tracking', href: '/#programs' },
]

const startLinks = [
  { label: 'Create profile', href: '/signup' },
  { label: 'Log in', href: '/login' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Questions', href: '/#faq' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
]

const capabilityMarks = [
  { Icon: Brain, label: 'Browser-based recommendation' },
  { Icon: ScanFace, label: 'On-device form analysis' },
  { Icon: ShieldCheck, label: 'Account-scoped data' },
]

export function PublicFooter() {
  const year = new Date().getFullYear()
  const reduceMotion = useReducedMotion()
  const wordmarkRef = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress: wordmarkProgress } = useScroll({
    target: wordmarkRef,
    offset: ['start end', 'end start'],
  })
  const wordmarkX = useTransform(wordmarkProgress, [0, 1], ['0vw', '-8vw'])

  return (
    <footer className="relative overflow-hidden bg-charcoal text-white">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="container-forge relative z-10 grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_1fr] lg:gap-10 lg:py-20"
      >
        <div>
          <Link to="/" aria-label="Forge Athletic home">
            <Logo variant="light" />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">
            A profile-led training workspace with browser-based workout planning and form feedback.
            Built around your body, your equipment and the week you actually have.
          </p>
          <div className="mt-6 flex items-center gap-2.5">
            {capabilityMarks.map(({ Icon, label }) => (
              <span
                key={label}
                title={label}
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/60"
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Explore</h3>
          <ul className="mt-5 space-y-3">
            {exploreLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.href}
                  className="group/roll text-sm text-white/65 transition-colors hover:text-orange-400"
                >
                  <RollingText>{link.label}</RollingText>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Platform</h3>
          <ul className="mt-5 space-y-3">
            {platformLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.href}
                  className="group/roll text-sm text-white/65 transition-colors hover:text-orange-400"
                >
                  <RollingText>{link.label}</RollingText>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Get started</h3>
          <ul className="mt-5 space-y-3.5 text-sm text-white/65">
            {startLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.href}
                  className="group/roll inline-flex items-center gap-2 transition-colors hover:text-orange-400"
                >
                  <RollingText>{link.label}</RollingText>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/25" />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            className="group/roll mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-orange-400 transition-colors hover:text-orange-300"
          >
            <RollingText>Create your profile</RollingText> <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      <div className="container-forge relative z-10 flex flex-col gap-4 border-t border-white/10 py-6 text-[11px] text-white/35 md:flex-row md:items-center md:justify-between">
        <p>© {year} Forge Athletic Co. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link key={link.label} to={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
          <span className="hidden text-white/15 md:inline">|</span>
          <span>Browser-based AI · web app</span>
        </div>
      </div>

      <div aria-hidden="true" className="relative select-none overflow-hidden">
        <motion.p
          ref={wordmarkRef}
          initial={reduceMotion ? false : { opacity: 0, y: 64 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          style={reduceMotion ? undefined : { x: wordmarkX }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="display-word whitespace-nowrap px-4 pb-1 text-left text-white/[0.08] sm:px-8"
        >
          LET&apos;S START<span className="text-orange-500/60">.</span>
        </motion.p>
      </div>
    </footer>
  )
}
