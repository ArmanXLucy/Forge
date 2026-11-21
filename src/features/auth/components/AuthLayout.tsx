import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Quote, ShieldCheck, Star } from 'lucide-react'
import { Logo } from '../../../components/ui/Logo'
import { BRAND } from '../../../lib/constants'

interface AuthLayoutProps {
  title: ReactNode
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  topSlot?: ReactNode
  image?: string
  imageAlt?: string
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  topSlot,
  image = '/images/hero-athlete.jpg',
  imageAlt = 'Athlete training at Forge Athletic',
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-ivory lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden overflow-hidden bg-charcoal lg:block lg:h-screen">
          <img
            src={image}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/30" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <Link to="/" aria-label="Back to Forge Athletic home">
              <Logo variant="light" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-orange-500" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <Quote className="mt-5 h-9 w-9 text-white/25" aria-hidden="true" />
              <p className="mt-2 max-w-md text-xl leading-snug text-white sm:text-2xl">
                A plan is only useful if it fits the life you actually live.
              </p>
              <div className="mt-7 flex items-center gap-4 border-t border-white/15 pt-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 font-display text-base text-white">
                  FA
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Forge Athletic Coaching</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                    {BRAND.city}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> Certified coaching
              </span>
              <span>Private studio</span>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col bg-ivory lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <Link to="/" className="lg:hidden" aria-label="Forge Athletic home">
              <Logo />
            </Link>
            <Link
              to="/"
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal/50 transition-colors hover:text-charcoal"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8 lg:px-10">
            <div className="w-full max-w-[430px]">
              {topSlot && <div className="mb-8">{topSlot}</div>}
              <p className="eyebrow">
                <span className="h-px w-6 bg-current" /> Forge Athletic
              </p>
              <h1 className="mt-4 font-display text-4xl uppercase leading-none text-charcoal sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/55">{subtitle}</p>
              <div className="mt-8">{children}</div>
              {footer && <div className="mt-6">{footer}</div>}
              <p className="mt-8 text-center text-[10px] leading-relaxed text-charcoal/30">
                Demo project · Sample content. Authentication is handled by Firebase when configured;
                otherwise a clearly labelled local demo session is used.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
