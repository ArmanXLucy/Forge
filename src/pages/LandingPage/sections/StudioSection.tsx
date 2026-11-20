import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Dumbbell, ShieldCheck, Sparkles, Timer } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { STUDIO_TABS } from '../../../data/landing'
import { cn } from '../../../lib/utils'

const trustItems = [
  { icon: ShieldCheck, title: 'Certified & insured', text: 'Sport science foundation, professional liability cover.' },
  { icon: Dumbbell, title: 'Private training floor', text: 'Full strength and cardio setup, reserved per session.' },
  { icon: Timer, title: 'Assessment first', text: 'No programme is written before we understand your baseline.' },
  { icon: Sparkles, title: 'Progress, measured', text: 'Regular re-testing and programme adjustments every 4–6 weeks.' },
]

export function StudioSection() {
  const [activeId, setActiveId] = useState(STUDIO_TABS[0].id)
  const active = STUDIO_TABS.find((tab) => tab.id === activeId) ?? STUDIO_TABS[0]

  return (
    <section id="studio" className="relative overflow-hidden bg-charcoal text-white">
      <div className="container-forge py-16 sm:py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="The studio"
              theme="dark"
              drift={2.2}
              title={
                <>
                  A private floor.
                  <br />
                  <span className="text-white/35">A singular focus.</span>
                </>
              }
              description="You train behind a closed door, in a studio equipped for serious strength work and calm recovery. No audience, no waiting, no noise."
            />
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-7">
              <div>
                <p className="font-display text-3xl text-orange-500">140m²</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Training floor</p>
              </div>
              <div>
                <p className="font-display text-3xl text-white">1:1</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Coaching ratio</p>
              </div>
              <div>
                <p className="font-display text-3xl text-white">06–21</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Opening hours</p>
              </div>
            </div>
          </div>

          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="relative aspect-[16/11] overflow-hidden sm:aspect-[16/9]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={active.id}
                    src={active.image}
                    alt={active.title}
                    initial={{ opacity: 0, scale: 1.06, clipPath: 'inset(0% 0% 100% 0%)' }}
                    animate={{ opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
                    exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="max-w-lg"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-orange-400">
                        {active.stat}
                      </p>
                      <p className="mt-1.5 font-display text-xl uppercase leading-tight text-white sm:text-2xl">
                        {active.title}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  <span className="hidden shrink-0 rounded-full border border-white/25 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-white/70 sm:inline-flex">
                    {active.number} / 04
                  </span>
                </div>
              </div>

              <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {STUDIO_TABS.map((tab) => {
                  const isActive = tab.id === activeId
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        'transition-colors',
                        isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(tab.id)}
                        aria-expanded={isActive}
                        className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                      >
                        <span
                          className={cn(
                            'text-[9px] font-bold tracking-[0.18em]',
                            isActive ? 'text-orange-500' : 'text-white/30',
                          )}
                        >
                          {tab.number}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-semibold uppercase tracking-[0.14em]',
                            isActive ? 'text-white' : 'text-white/50',
                          )}
                        >
                          {tab.label}
                        </span>
                        <ArrowUpRight
                          className={cn(
                            'ml-auto h-4 w-4 transition-transform',
                            isActive ? 'text-orange-500' : 'text-white/25',
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-5 text-[13px] leading-relaxed text-white/55 sm:px-5">
                              {tab.body}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-6 border-t border-white/10 pt-9 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">{title}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
