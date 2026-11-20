import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Plus } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { buttonClasses } from '../../../components/ui/Button'
import { PROGRAMS } from '../../../data/landing'
import { cn } from '../../../lib/utils'

export function ProgramsSection() {
  const [activeId, setActiveId] = useState(PROGRAMS[0].id)
  const active = PROGRAMS.find((program) => program.id === activeId) ?? PROGRAMS[0]

  return (
    <section id="programs" className="bg-ivory py-16 sm:py-20 lg:py-28">
      <div className="container-forge">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                eyebrow="Coaching programs"
                drift={1.8}
                title={
                  <>
                    Train with
                    <br />
                    <span className="text-charcoal/30">intention.</span>
                  </>
                }
                description="Six ways to work together. Every programme begins with an assessment and ends with a measurable result — never a template."
              />
              <div className="mt-8 hidden overflow-hidden rounded-2xl lg:block">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={active.id}
                    src={active.image}
                    alt={active.title}
                    initial={{ opacity: 0, scale: 1.045 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                </AnimatePresence>
                <div className="flex items-center justify-between border border-t-0 border-charcoal/10 bg-white px-5 py-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-600">
                      {active.number} — Selected
                    </p>
                    <p className="mt-1 font-display text-lg uppercase leading-none text-charcoal">
                      {active.title}
                    </p>
                  </div>
                  <Link
                    to="/signup"
                    aria-label={`Start ${active.title}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white transition-colors hover:bg-orange-500"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <Link to="/signup" className={buttonClasses('dark', 'default', 'mt-8 hidden lg:inline-flex')}>
                Find your programme <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="divide-y divide-charcoal/10 border-y border-charcoal/10">
              {PROGRAMS.map((program, index) => {
                const isActive = program.id === activeId
                return (
                  <motion.div
                    key={program.id}
                    className={cn('group transition-colors', isActive && 'bg-white')}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.65, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(program.id)}
                      aria-expanded={isActive}
                      className="flex w-full items-start gap-4 px-1 py-5 text-left sm:gap-6 sm:px-4 sm:py-6"
                    >
                      <span
                        className={cn(
                          'mt-1 text-[10px] font-bold tracking-[0.18em]',
                          isActive ? 'text-orange-600' : 'text-charcoal/35',
                        )}
                      >
                        {program.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block font-display text-2xl uppercase leading-none transition-colors sm:text-3xl',
                            isActive ? 'text-charcoal' : 'text-charcoal/55 group-hover:text-charcoal',
                          )}
                        >
                          {program.title}
                        </span>
                        <span className="mt-1.5 block text-[11px] uppercase tracking-[0.14em] text-charcoal/40">
                          {program.tagline}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all',
                          isActive
                            ? 'rotate-45 border-orange-500 bg-orange-500 text-white'
                            : 'border-charcoal/15 text-charcoal/50 group-hover:border-charcoal/40',
                        )}
                      >
                        {isActive ? <Plus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-5 px-1 pb-6 sm:grid-cols-[1fr_180px] sm:px-4 sm:pl-[52px]">
                            <div>
                              <p className="max-w-lg text-[14px] leading-relaxed text-charcoal/60">
                                {program.description}
                              </p>
                              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                                {program.includes.map((item) => (
                                  <li
                                    key={item}
                                    className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal/70"
                                  >
                                    <Check className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="overflow-hidden rounded-xl lg:hidden xl:block">
                              <img
                                src={program.image}
                                alt={program.title}
                                className="h-32 w-full object-cover sm:h-full sm:min-h-[120px]"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:hidden">
              <Link to="/signup" className={buttonClasses('dark', 'default', 'w-full sm:w-auto')}>
                Find your programme <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className={buttonClasses('outline', 'default', 'w-full sm:w-auto')}>
                View pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
