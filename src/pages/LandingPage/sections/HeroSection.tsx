import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'
import { buttonClasses } from '../../../components/ui/Button'
import { DISCIPLINES, HERO_STATS } from '../../../data/landing'
import { RollingText } from '../../../components/motion/RollingText'

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
}

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
}

const titleDrop = {
  hidden: { opacity: 0, y: -48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.05, delay: 0.06, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export function HeroSection({ introDone = true }: { introDone?: boolean }) {
  const reduceMotion = useReducedMotion()
  const play = introDone || Boolean(reduceMotion)
  const wordmarkRef = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress: wordmarkProgress } = useScroll({
    target: wordmarkRef,
    offset: ['start end', 'end start'],
  })
  const wordmarkX = useTransform(wordmarkProgress, [0, 1], ['0vw', '-10vw'])

  return (
    <section id="home" className="relative overflow-hidden bg-charcoal text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-orange-500/[0.07] blur-3xl"
      />
      <div className="container-forge relative z-10">
        <div className="grid items-end gap-10 pb-10 pt-[128px] sm:pt-[152px] lg:grid-cols-12 lg:gap-8 lg:pb-14 lg:pt-[168px]">
          <motion.div
            className="relative z-20 lg:col-span-7"
            variants={reduceMotion ? undefined : heroContainer}
            initial={reduceMotion ? false : 'hidden'}
            animate={play ? 'show' : 'hidden'}
          >
            <motion.p variants={reduceMotion ? undefined : rise} className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Personalized training · on-device AI
            </motion.p>

            <motion.h1 variants={reduceMotion ? undefined : titleDrop} className="display-hero mt-5 text-white">
              Build your
              <br />
              <span className="text-orange-500">stronger</span>
              <br />
              self<span className="text-orange-500">.</span>
            </motion.h1>

            <motion.div variants={reduceMotion ? undefined : rise} className="mt-7 max-w-xl">
              <p className="text-[15px] leading-relaxed text-white/60 sm:text-base">
                Forge turns your profile, goals, equipment and training history into a
                structured weekly plan — then checks your form in the browser as you train. No
                generic template, no wearable, no external AI service.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/signup" className={buttonClasses('primary', 'default', 'group group/roll w-full sm:w-auto')}>
                  <RollingText>Start your journey</RollingText>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <a href="#programs" className={buttonClasses('outline-light', 'default', 'w-full sm:w-auto')}>
                  Explore the platform
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                    24 plan templates · 3 form checks
                  </span>
                </div>
                <span className="hidden h-4 w-px bg-white/15 sm:block" />
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> On-device AI
                </span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 34, scale: 0.9 }}
            animate={play ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 34, scale: 0.9 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:col-span-5"
          >
            <div className="relative mx-auto w-full max-w-[440px] lg:max-w-none">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.55, delay: 0.62 }}
                className="absolute -left-3 top-8 z-20 hidden rounded-full border border-white/15 bg-charcoal/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 backdrop-blur sm:block lg:-left-6"
              >
                Web app · Browser AI
              </motion.div>
              <div className="relative overflow-hidden rounded-[24px] border border-white/10">
                <motion.img
                  src="/images/app/overview-tall.webp"
                  alt="Forge Athletic dashboard showing profile completion, the weekly plan and the next workout"
                  width={1200}
                  height={1500}
                  initial={reduceMotion ? false : { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.06 }}
                  animate={
                    play
                      ? { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }
                      : { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.06 }
                  }
                  transition={{ duration: 1.2, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="h-[380px] w-full object-cover object-top sm:h-[460px] lg:h-[560px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400">
                        The workspace
                      </p>
                      <p className="mt-1 max-w-[220px] text-sm font-medium leading-snug text-white/90">
                        Your whole training week in one clear view.
                      </p>
                    </div>
                    <a
                      href="#studio"
                      aria-label="Explore the Forge workspace"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-transform hover:scale-105"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
                animate={play ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.7, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -left-4 bottom-16 z-20 hidden w-[170px] rounded-2xl border border-white/10 bg-ivory p-4 text-charcoal shadow-lift sm:block lg:-left-8"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal/45">
                  Weekly structure
                </p>
                <p className="mt-1.5 font-display text-3xl leading-none">7</p>
                <p className="mt-1 text-[11px] text-charcoal/55">day plan, with rest built in</p>
                <div className="mt-3 flex gap-1" aria-hidden="true">
                  {[65, 90, 45, 100, 72, 30, 55].map((height, index) => (
                    <span
                      key={index}
                      className="w-2 rounded-sm bg-orange-500/80"
                      style={{ height: `${height * 0.28}px` }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-y-6 border-t border-white/10 py-6 sm:grid-cols-4 sm:gap-4">
          {HERO_STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.7, delay: 0.6 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col"
            >
              <span className="font-display text-2xl leading-none text-white sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-white/35">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full overflow-hidden border-t border-white/10">
        <div className="container-forge flex items-center justify-between py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
            Forge Athletic Co.
          </p>
          <p className="hidden text-[9px] uppercase tracking-[0.25em] text-white/25 sm:block">
            Profile-led · Browser AI
          </p>
          <a href="#studio" className="text-[9px] uppercase tracking-[0.2em] text-white/40 hover:text-white">
            Scroll ↓
          </a>
        </div>
        <motion.p
          ref={wordmarkRef}
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, y: 42 }}
          animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 42 }}
          style={reduceMotion ? undefined : { x: wordmarkX }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="display-word select-none whitespace-nowrap border-t border-white/10 px-4 pt-4 text-white/[0.07] sm:px-8"
        >
          FORGE ATHLETIC
        </motion.p>
      </div>
    </section>
  )
}

export function DisciplineMarquee() {
  const items = [...DISCIPLINES, ...DISCIPLINES]
  return (
    <div className="overflow-hidden border-y border-orange-600/20 bg-orange-500 py-4 text-charcoal">
      <div className="flex w-max animate-marquee items-center gap-8 pause-on-hover">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-8">
            <span className="font-display text-sm uppercase tracking-[0.08em] sm:text-base">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rotate-45 bg-charcoal/60" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  )
}
