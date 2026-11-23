import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { buttonClasses } from '../../../components/ui/Button'
import { PLATFORM_PLANS } from '../../../data/landing'
import { cn } from '../../../lib/utils'

export function PricingSection() {
  return (
    <section id="included" className="relative overflow-hidden bg-charcoal py-16 text-white sm:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-orange-500/[0.06] blur-3xl"
      />
      <div className="container-forge relative z-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Core experience"
            theme="dark"
            drift={2.2}
            title={
              <>
                Everything in
                <br />
                <span className="text-white/35">one workspace.</span>
              </>
            }
          />
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-white/50">
              No invented plans or prices. These are the core capabilities built into Forge, connected
              through the same profile and account.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Profile-led from day one
            </p>
          </div>
        </div>

        <div className="mt-11 grid gap-4 lg:grid-cols-3 lg:gap-5">
          {PLATFORM_PLANS.map((plan, index) => (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 36, scale: 0.985 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6 sm:p-7',
                plan.highlighted
                  ? 'border-orange-500 bg-orange-500 text-white shadow-glow'
                  : 'border-white/10 bg-white/[0.03] text-white',
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-charcoal px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400 ring-1 ring-orange-500/30">
                  {plan.badge}
                </span>
              )}
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em]',
                  plan.highlighted ? 'text-white/70' : 'text-orange-400',
                )}
              >
                {plan.name}
              </p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-4xl leading-none sm:text-5xl">{plan.price}</span>
                <span
                  className={cn(
                    'text-[11px] uppercase tracking-[0.12em]',
                    plan.highlighted ? 'text-white/70' : 'text-white/40',
                  )}
                >
                  {plan.cadence}
                </span>
              </div>
              <p
                className={cn(
                  'mt-3 text-[13px] leading-relaxed',
                  plan.highlighted ? 'text-white/80' : 'text-white/50',
                )}
              >
                {plan.description}
              </p>
              <ul className="mt-6 flex-1 space-y-3 border-t border-current/10 pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        plan.highlighted ? 'text-white' : 'text-orange-500',
                      )}
                      aria-hidden="true"
                    />
                    <span className={plan.highlighted ? 'text-white/90' : 'text-white/65'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={cn(
                  'mt-7 w-full',
                  plan.highlighted
                    ? buttonClasses('white', 'default', 'w-full')
                    : buttonClasses('outline-light', 'default', 'w-full'),
                )}
              >
                Start with {plan.name}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.article>
          ))}
        </div>

        <div className="mt-7 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-white/35 sm:flex-row">
          <p>
            Profile, planning and form feedback stay connected in one account.
          </p>
          <p>No subscription pricing shown · product demo</p>
        </div>
      </div>
    </section>
  )
}
