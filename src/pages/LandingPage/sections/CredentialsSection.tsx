import { BadgeCheck, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { CREDENTIALS } from '../../../data/landing'

export function CredentialsSection() {
  return (
    <section className="bg-sand py-16 sm:py-20 lg:py-28">
      <div className="container-forge">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Credentials"
              title={
                <>
                  Qualified
                  <br />
                  <span className="text-charcoal/30">by design.</span>
                </>
              }
              description="Coaching should be grounded in science and held to a professional standard. These are sample credentials for the demo build."
            />
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-charcoal/15 bg-white/60 px-4 py-2 text-[11px] font-medium text-charcoal/60">
              <BadgeCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Sample credentials — replace with verified documents in Stage 2
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {CREDENTIALS.map((credential, index) => (
              <motion.article
                key={credential.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col rounded-2xl border border-charcoal/10 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ivory text-charcoal transition-colors group-hover:bg-orange-500 group-hover:text-white">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-xl text-charcoal/20">{credential.year}</span>
                </div>
                <h3 className="mt-5 text-[15px] font-semibold leading-snug text-charcoal">
                  {credential.title}
                </h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-600">
                  {credential.institution}
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-charcoal/50">
                  {credential.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
