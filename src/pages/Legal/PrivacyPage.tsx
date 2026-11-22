import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PublicNavbar } from '../../components/navigation/PublicNavbar'
import { PublicFooter } from '../../components/layout/PublicFooter'
import { BRAND } from '../../lib/constants'

export default function PrivacyPage() {
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
        <h1 className="display-h2 mt-3 text-charcoal">Privacy policy</h1>
        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-charcoal/35">
          Demo policy · Last updated {new Date().getFullYear()}
        </p>

        <div className="mt-8 space-y-7 text-[14px] leading-relaxed text-charcoal/65">
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">1. About this project</h2>
            <p className="mt-2">
              This website is a frontend demonstration for Forge Athletic, a fictional fitness coaching
              brand. It is built as Stage 1 of a three-stage project. No custom application server,
              payment processing or secure medical-record system is connected. Firebase Authentication,
              Cloud Firestore and Supabase Storage provide the current data services.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">2. What is stored</h2>
            <p className="mt-2">
              When you use the demo, your Quick Start basics (name, age, height, current weight, goal,
              experience, available training days), mission completion status, completion timestamps
              and XP, mission answers, generated workout plans, workout and nutrition logs, progress
              records, recovery entries and AI Coach session summaries may be saved in your
              browser&apos;s localStorage. A demo-session flag may also be saved.
            </p>
            <p className="mt-2">
              When Firebase is configured and you sign in, those records are also stored in Cloud
              Firestore under your authenticated user ID. Mission answers include the Health Profile
              and Nutrition Profile fields, such as conditions, injuries, medications, allergies,
              intolerances, restrictions and clearance. Do not enter prescription numbers, laboratory
              reports or other medical documents. Authorised user-management administrators can read
              mission answers under the Firestore security rules; support staff cannot read the
              sensitive mission-answer collection.
            </p>
            <p className="mt-2">
              If you upload a profile image, the image file is stored in Supabase Storage and its URL
              and path are stored in Firestore. Mission progress photographs are preview-only and are
              not uploaded. Camera frames and video from AI Coach are processed in the browser and are
              not stored.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">3. Authentication</h2>
            <p className="mt-2">
              Firebase Authentication may process your email address and account identifiers when
              configured by the site owner. Firebase&apos;s own privacy terms apply. This application does
              not manually store passwords or authentication tokens in localStorage. When Firebase is not
              configured, a clearly labelled local demo session is used instead.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">4. Medical disclaimer</h2>
            <p className="mt-2">
              Information on this site is for general educational purposes and is not medical advice.
              Always consult a qualified medical professional before beginning a new exercise or nutrition
              programme. Seek clearance if you have an existing condition, injury or pregnancy.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">5. Your choices</h2>
            <p className="mt-2">
              You can clear all locally stored demo data from Dashboard → Settings → Data &amp; privacy.
              Clearing site data in your browser has the same effect. Account deletion and secure
              health-data export will be implemented with the Stage 2 backend.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl uppercase text-charcoal">6. Contact</h2>
            <p className="mt-2">
              Placeholder contact: <a className="underline" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
