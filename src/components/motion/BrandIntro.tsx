import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const INTRO_KEY = 'forge:intro:v1'

/**
 * Short cinematic brand reveal adapted from the reference recording.
 * It never gates the page for more than ~1.6s, can be skipped by click or key,
 * and is shown once per browser session. Reduced-motion users skip it entirely.
 */
export function BrandIntro({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | null>(null)
  const completed = useRef(false)

  const finish = () => {
    if (completed.current) return
    completed.current = true
    if (timer.current) window.clearTimeout(timer.current)
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      // sessionStorage can be unavailable in restricted browsers.
    }
    setVisible(false)
    onComplete()
  }

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === '1'
    } catch {
      seen = false
    }

    if (reduceMotion || seen) {
      onComplete()
      return
    }

    setVisible(true)
    document.body.style.overflow = 'hidden'
    timer.current = window.setTimeout(finish, 1350)

    const onKey = () => finish()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer.current) window.clearTimeout(timer.current)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col overflow-hidden bg-charcoal text-white"
          initial={{ opacity: 1 }}
          exit={{
            clipPath: 'inset(0 0 100% 0)',
            transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] },
          }}
          onClick={finish}
          role="presentation"
        >
          <div className="container-forge flex items-center justify-between py-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
              Forge Athletic Co.
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Lausanne · CH
            </p>
          </div>

          <div className="container-forge relative flex flex-1 flex-col justify-center gap-8 pb-10 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
            <div className="max-w-xl">
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="eyebrow-light"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Personal coaching · since 2014
              </motion.p>
              <div className="mt-4 overflow-hidden">
                <motion.p
                  initial={{ y: '108%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.8, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="font-display text-[clamp(3.2rem,9.4vw,8.5rem)] uppercase leading-[0.88] tracking-[-0.01em]"
                >
                  Forge
                  <br />
                  Athletic<span className="text-orange-500">.</span>
                </motion.p>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="mt-5 max-w-sm text-[13px] leading-relaxed text-white/45"
              >
                Strength built on assessment, not guesswork.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)', scale: 1.05 }}
              animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)', scale: 1 }}
              transition={{ duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden w-[240px] shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:block lg:w-[280px]"
            >
              <img
                src="/images/hero-athlete.jpg"
                alt=""
                aria-hidden="true"
                className="aspect-[4/5] w-full object-cover object-top opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
              <p className="absolute inset-x-0 bottom-0 p-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                Private studio · Lausanne
              </p>
            </motion.div>
          </div>

          <div className="container-forge pb-7">
            <div className="flex items-center justify-between gap-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">
                Entering the studio
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
                Click to skip
              </p>
            </div>
            <div className="mt-3 h-px w-full overflow-hidden bg-white/15">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.15, ease: 'linear' }}
                className="h-full w-full origin-left bg-orange-500"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
