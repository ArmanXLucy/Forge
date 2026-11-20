import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PublicNavbar } from '../../components/navigation/PublicNavbar'
import { PublicFooter } from '../../components/layout/PublicFooter'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <PublicNavbar forceSolid />
      <main className="container-narrow pb-20 pt-32 sm:pt-36">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40 hover:text-charcoal"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <p className="eyebrow mt-8 flex w-fit">Legal</p>
        <h1 className="display-h2 mt-3 text-charcoal">Terms &amp; conditions</h1>
        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-charcoal/35">
          Demo terms · Last updated {new Date().getFullYear()}
        </p>

        <div className="mt-8 space-y-7 text-[14px] leading-relaxed text-charcoal/65">
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">1. Demo status</h2>
            <p className="mt-2">
              Forge Athletic is a fictional brand created for a demonstration project. All pricing,
              testimonials, statistics, credentials, contact details, programmes and coaching claims on
              this site are sample content. Nothing on this site constitutes a real commercial offer.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">2. No medical relationship</h2>
            <p className="mt-2">
              Use of this website does not create a coach–client or medical relationship. Exercise and
              nutrition information is general in nature. You are responsible for obtaining medical
              clearance and for stopping any activity that causes pain or unusual symptoms.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">3. Acceptable use</h2>
            <p className="mt-2">
              Do not use the demo to submit real medical documents, prescription numbers, or sensitive
              personal data. The frontend does not provide secure storage for such information. Do not
              attempt to disrupt, scrape or reverse-engineer the application.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">4. Accounts</h2>
            <p className="mt-2">
              Authentication may be provided by Firebase when configured. You are responsible for keeping
              your credentials secure. Demo accounts are local previews only and may be reset at any time.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">5. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, the project authors accept no liability for loss or
              injury arising from use of this demonstration website, its sample programmes or its sample
              nutrition content.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">6. Future stages</h2>
            <p className="mt-2">
              A real service will require a secure backend, professional insurance, verified credentials,
              medical clearance workflows and jurisdiction-specific terms. These are reserved for Stages 2
              and 3 and are not implemented here.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
