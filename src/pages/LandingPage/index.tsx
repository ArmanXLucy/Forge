import { useState } from 'react'
import { PublicNavbar } from '../../components/navigation/PublicNavbar'
import { BrandIntro } from '../../components/motion/BrandIntro'
import { PublicFooter } from '../../components/layout/PublicFooter'
import { HeroSection, DisciplineMarquee } from './sections/HeroSection'
import { StudioSection } from './sections/StudioSection'
import { ProgramsSection } from './sections/ProgramsSection'
import { AboutSection } from './sections/AboutSection'
import { HowItWorksSection } from './sections/HowItWorksSection'
import { GallerySection } from './sections/GallerySection'
import { TestimonialsSection } from './sections/TestimonialsSection'
import { CredentialsSection } from './sections/CredentialsSection'
import { PricingSection } from './sections/PricingSection'
import { FaqSection } from './sections/FaqSection'
import { ContactCtaSection } from './sections/ContactCtaSection'

export default function LandingPage() {
  const [introDone, setIntroDone] = useState(false)

  return (
    <div className="min-h-screen bg-ivory">
      <BrandIntro onComplete={() => setIntroDone(true)} />
      <PublicNavbar />
      <main>
        <HeroSection introDone={introDone} />
        <DisciplineMarquee />
        <StudioSection />
        <ProgramsSection />
        <AboutSection />
        <HowItWorksSection />
        <GallerySection />
        <TestimonialsSection />
        <CredentialsSection />
        <PricingSection />
        <FaqSection />
        <ContactCtaSection />
      </main>
      <PublicFooter />
    </div>
  )
}
