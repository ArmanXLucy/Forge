import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, CalendarCheck, Mail, MapPin, Phone } from 'lucide-react'
import { buttonClasses } from '../../../components/ui/Button'
import { BRAND } from '../../../lib/constants'
import { ParallaxImage } from '../../../components/motion/ParallaxImage'
import { RollingText } from '../../../components/motion/RollingText'

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
              Start with a two-minute profile and a complimentary intro call. No pressure, no
              generic sales pitch — just an honest conversation about where you are and where you
              want to go.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={buttonClasses('primary', 'default', 'group group/roll')}>
                <RollingText>Start your journey</RollingText>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href={`mailto:${BRAND.email}?subject=Intro%20call%20request`}
                className={buttonClasses('outline-light', 'default')}
              >
                <CalendarCheck className="h-4 w-4" /> Book an intro call
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
                The studio
              </p>
              <p className="mt-2 font-display text-2xl uppercase leading-tight text-white">
                Let&apos;s talk about your goals.
              </p>
              <ul className="mt-6 space-y-4 text-sm">
                <li>
                  <a
                    href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
                    className="flex items-start gap-3 text-white/75 transition-colors hover:text-white"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Phone className="h-4 w-4 text-orange-400" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/35">
                        Call
                      </span>
                      {BRAND.phone}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${BRAND.email}`}
                    className="flex items-start gap-3 text-white/75 transition-colors hover:text-white"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Mail className="h-4 w-4 text-orange-400" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/35">
                        Email
                      </span>
                      {BRAND.email}
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-white/75">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <MapPin className="h-4 w-4 text-orange-400" />
                  </span>
                  <span>
                    <span className="block text-[10px] uppercase tracking-[0.16em] text-white/35">
                      Studio
                    </span>
                    {BRAND.address}
                  </span>
                </li>
              </ul>
              <div className="mt-6 rounded-xl border border-white/10 bg-charcoal/50 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-white/45">
                  Contact details and availability are placeholders for this demo. Studio visits are
                  by appointment only.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
