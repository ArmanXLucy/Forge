import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ClipboardCheck, LineChart, UserRoundCheck } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { buttonClasses } from '../../../components/ui/Button'

const steps = [
  {
    number: '01',
    icon: UserRoundCheck,
    title: 'Build your profile',
    description:
      'Start with the Quick Start, then complete seven focused missions covering body metrics, health, training history, nutrition, lifestyle, goals and mindset. Everything stays editable.',
    detail: 'Quick Start · 2 minutes',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: 'Generate your plan',
    description:
      'The recommendation model reads your goal, equipment, experience and safety category, selects from 24 training styles, and builds a validated week of sets, reps, rest and progression.',
    detail: 'Profile · 7 missions',
  },
  {
    number: '03',
    icon: LineChart,
    title: 'Train with feedback',
    description:
      'Log workouts, meals and recovery, then use the browser form coach for squat, curl or push-up checks. Your progress view connects the evidence so the next adjustment is informed.',
    detail: 'Feedback · every session',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-ivory py-16 sm:py-20 lg:py-28">
      <div className="container-forge">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                Three steps.
                <br />
                <span className="text-charcoal/30">No guesswork.</span>
              </>
            }
            className="max-w-2xl"
          />
          <p className="max-w-sm text-sm leading-relaxed text-charcoal/55">
            A deliberate setup, built to collect only what matters — progressively, and at
            your pace.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {steps.map(({ number, icon: Icon, title, description, detail }, index) => (
            <motion.article
              key={number}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-8"
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-charcoal text-white transition-colors group-hover:bg-orange-500">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-display text-5xl leading-none text-charcoal/[0.08] transition-colors group-hover:text-orange-500/20">
                  {number}
                </span>
              </div>
              <h3 className="mt-7 font-display text-2xl uppercase leading-tight text-charcoal">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-charcoal/55">{description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-charcoal/10 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-600">
                  {detail}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-charcoal/20" aria-hidden="true" />
                )}
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-charcoal p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
              Start where you are
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
              The Quick Start takes about two minutes. The seven deeper missions are available in
              any order, so the profile grows with the time you have.
            </p>
          </div>
          <Link to="/signup" className={buttonClasses('white', 'default', 'shrink-0')}>
            Take the Quick Start <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
