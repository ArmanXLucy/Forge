import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { buttonClasses } from '../../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-6 text-center text-white">
      <Logo variant="light" />
      <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.3em] text-orange-500">
        Error 404
      </p>
      <h1 className="display-h2 mt-3">Off the training plan.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
        This page does not exist, or it has moved. Let&apos;s get you back to solid ground.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className={buttonClasses('primary')}>
          Back to home <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/dashboard" className={buttonClasses('outline-light')}>
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>
    </div>
  )
}
