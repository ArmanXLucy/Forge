import { useRef } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Quote, Sparkles } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { CAPABILITIES } from '../../../data/landing'
import { Badge } from '../../../components/ui/Badge'

export function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const storiesRef = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress: storiesProgress } = useScroll({
    target: storiesRef,
    offset: ['start end', 'end start'],
  })
  const storiesX = useTransform(storiesProgress, [0, 1], ['5vw', '-5vw'])

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('[data-testimonial-card]')
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8
    track.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-charcoal py-16 text-white sm:py-20 lg:py-28">
      <motion.p
        ref={storiesRef}
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0, y: 46 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        style={reduceMotion ? undefined : { x: storiesX }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="display-word pointer-events-none absolute -right-12 top-6 select-none text-white/[0.035]"
      >
        CAPABILITIES
      </motion.p>

      <div className="container-forge relative z-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Product capabilities"
            theme="dark"
            drift={1.4}
            title={
              <>
                Built into
                <br />
                <span className="text-white/35">the workspace.</span>
              </>
            }
          />
          <div className="flex items-center gap-3">
            <Badge tone="light" className="hidden sm:inline-flex">
              Product capabilities
            </Badge>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Previous capabilities"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Next capabilities"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <motion.div
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, rotateX: 90 }}
          whileInView={{ opacity: 1, rotateX: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 900, transformOrigin: '50% 100%' }}
          className="mt-8 overflow-hidden text-white/[0.08]"
        >
          <div
            className="pause-on-hover flex w-max animate-marquee items-center"
            style={{ animationDuration: '46s' }}
          >
            {[0, 1].map((half) => (
              <div key={half} className="flex shrink-0 items-center">
                {Array.from({ length: 20 }).map((_, index) => (
                  <Sparkles
                    key={`${half}-${index}`}
                    className="mr-5 h-10 w-10 shrink-0 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                  />
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        <div
          ref={trackRef}
          className="hide-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-3 sm:mx-0 sm:px-0"
          aria-label="Forge product capabilities"
        >
          {CAPABILITIES.map((capability, index) => (
            <motion.article
              key={capability.name}
              data-testimonial-card
              initial={reduceMotion ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.75, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-[86%] snap-start flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm transition-colors hover:border-white/20 sm:min-w-[46%] sm:p-7 lg:min-w-[calc(33.333%-11px)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-400">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Available in Forge
                </span>
                <Quote className="h-7 w-7 text-white/15" aria-hidden="true" />
              </div>
              <p className="mt-5 flex-1 text-[15px] leading-relaxed text-white/70">
                {capability.quote}
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
                  {capability.initials}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white">{capability.name}</p>
                  <p className="text-[11px] text-white/40">{capability.detail}</p>
                </div>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                  Live
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/35 sm:hidden">
          Swipe to explore the product. These are capability descriptions, not customer
          testimonials.
        </p>
        <div className="mt-5 hidden items-center gap-2 text-[11px] text-white/35 sm:flex">
          <span className="h-px w-8 bg-white/20" />
          Product capabilities, not customer testimonials.
        </div>
      </div>
    </section>
  )
}
