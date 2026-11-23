import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Activity, Apple, BedDouble, HeartPulse, Ruler, Target } from 'lucide-react'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { buttonClasses } from '../../../components/ui/Button'
import { ParallaxImage } from '../../../components/motion/ParallaxImage'

const dimensions = [
  { icon: Ruler, title: 'Body metrics', text: 'Weight, composition and measurements you can track.' },
  { icon: Activity, title: 'Training history', text: 'Experience, equipment and current benchmarks.' },
  { icon: BedDouble, title: 'Lifestyle', text: 'Sleep, stress, work and daily movement.' },
  { icon: Apple, title: 'Nutrition', text: 'Preferences, allergies, cooking and budget.' },
  { icon: HeartPulse, title: 'Safety profile', text: 'Conditions, injuries and medical clearance.' },
  { icon: Target, title: 'Individual goals', text: 'What progress actually looks like to you.' },
]

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-warmblack text-white">
      <div className="container-forge py-16 sm:py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative lg:col-span-5">
            <div className="overflow-hidden rounded-2xl">
              <ParallaxImage
                src="/images/app/overview-tall.webp"
                alt="Forge Athletic dashboard showing the weekly training overview and profile completion"
                className="aspect-[4/5] w-full object-cover"
                strength={30}
                drift={-10}
                zoom={1.08}
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -right-2 hidden w-44 overflow-hidden rounded-2xl border-4 border-warmblack sm:block lg:-right-6 lg:w-52">
              <ParallaxImage
                src="/images/app/missions-tall.webp"
                alt="Forge Athletic missions screen showing the seven guided profile sections"
                className="aspect-square w-full object-cover"
                strength={16}
                drift={8}
                revealDelay={0.12}
                zoom={1.09}
                loading="lazy"
              />
            </div>
            <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-charcoal/60 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              Browser AI · No install
            </div>
          </div>

          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Our approach"
              theme="dark"
              title={
                <>
                  Fitness should fit
                  <br />
                  <span className="text-white/35">your life.</span>
                </>
              }
              description="A plan is only useful if it fits the week you actually have. Forge starts with a structured profile, then uses it to shape the training, nutrition and recovery context around your real schedule — not a generic template."
            />

            <div className="mt-9 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {dimensions.map(({ icon: Icon, title, text }, index) => (
                <motion.div
                  key={title}
                  className="flex gap-3.5 border-t border-white/10 pt-4"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.65, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden="true" />
                  <div>
                    <h3 className="text-[13px] font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/45">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.blockquote
              className="mt-9 border-l-2 border-orange-500 pl-5"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[15px] leading-relaxed text-white/70">
                “The best programme is not the hardest one on paper. It is the one you can repeat,
                recover from and still want to do next month.”
              </p>
              <footer className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Forge Athletic — Product principle
              </footer>
            </motion.blockquote>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={buttonClasses('primary', 'default', 'group')}>
                Create your profile
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a href="#how-it-works" className={buttonClasses('outline-light', 'default')}>
                See how it works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
