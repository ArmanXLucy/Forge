import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Brain, ScanFace, UserRoundPlus } from 'lucide-react'
import { buttonClasses } from '../../../components/ui/Button'
import { ParallaxImage } from '../../../components/motion/ParallaxImage'
import { RollingText } from '../../../components/motion/RollingText'

const nextSteps = [
  {
    icon: UserRoundPlus,
    title: 'Create your profile',
    detail: 'Quick Start plus seven guided missions',
  },
  {
    icon: Brain,
    title: 'Generate your plan',
    detail: 'A validated week from 24 training styles',
  },
  {
    icon: ScanFace,
    title: 'Train with feedback',
    detail: 'Log sessions and check your form',
  },
]

export function ContactCtaSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-charcoal text-white">
      <div className="absolute inset-0">
        <ParallaxImage
          src="/images/training.jpg"
          alt=""
          aria-hidden="true"
          strength={34}
          zoom={1.06}
          className="h-full w-full object-cover object-center opacity-25"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/95 to-charcoal/60" />
      </div>

      <div className="container-forge relative z-10 py-16 sm:py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Your next chapter
            </p>
            <h2 className="display-h2 mt-5 text-white">
              Ready to build
              <br />
              a <span className="text-orange-500">stronger</span> self?
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">
              Start with a two-minute profile. Complete the seven guided missions at your pace,
              generate a structured training week, and use the browser form coach when you want a
              second opinion. No install and no sales call.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={buttonClasses('primary', 'default', 'group group/roll')}>
                <RollingText>Create your profile</RollingText>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a href="#how-it-works" className={buttonClasses('outline-light', 'default')}>
                See how it works
              </a>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
                The workspace
              </p>
              <p className="mt-2 font-display text-2xl uppercase leading-tight text-white">
                Your first three steps.
              </p>
              <ul className="mt-6 space-y-4 text-sm">
                {nextSteps.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="flex items-start gap-3 text-white/75">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-4 w-4 text-orange-400" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-[11px] text-white/40">{detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-white/10 bg-charcoal/50 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-white/45">
                  Works in a modern browser. Camera access is optional; you can use the rest of the
                  workspace without it.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
