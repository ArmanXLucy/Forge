import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { FAQS } from '../../../data/landing'
import { cn } from '../../../lib/utils'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-ivory py-16 sm:py-20 lg:py-28">
      <div className="container-forge grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="Questions"
            title={
              <>
                Before you
                <br />
                <span className="text-charcoal/30">begin.</span>
              </>
            }
            description="Straight answers about how Forge works, what it stores and what the AI can and cannot do."
          />
          <div className="mt-7 hidden rounded-2xl border border-charcoal/10 bg-white p-5 lg:block">
            <p className="text-[12px] font-semibold text-charcoal">Not sure where to start?</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-charcoal/50">
              Create a profile and begin with the two-minute Quick Start. The seven missions can be
              completed in any order.
            </p>
            <Link
              to="/signup"
              className="mt-3 inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 hover:text-orange-700"
            >
              Create your profile →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="divide-y divide-charcoal/10 border-y border-charcoal/10">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, delay: Math.min(index, 4) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    className="flex w-full items-center gap-4 py-5 text-left"
                  >
                    <span className="text-[10px] font-bold tracking-[0.18em] text-charcoal/30">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-[15px] font-semibold leading-snug transition-colors',
                        isOpen ? 'text-charcoal' : 'text-charcoal/70',
                      )}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all',
                        isOpen
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-charcoal/15 text-charcoal/50',
                      )}
                    >
                      {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pl-8 pr-10 text-[13px] leading-relaxed text-charcoal/55 sm:text-sm">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
