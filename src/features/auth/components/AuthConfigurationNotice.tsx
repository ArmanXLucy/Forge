import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, FlaskConical } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useProfileStore } from '../../../store/useProfileStore'

export function AuthConfigurationNotice() {
  const { configured, missingVariables, enterDemo } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const navigate = useNavigate()

  if (configured) return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-[12px] font-semibold text-amber-900">
            Firebase authentication is not configured
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-800/80">
            Create a <code className="rounded bg-amber-100 px-1">.env</code> file from{' '}
            <code className="rounded bg-amber-100 px-1">.env.example</code> and restart the dev
            server. Missing: {missingVariables.join(', ')}.
          </p>
          <button
            type="button"
            onClick={() => {
              enterDemo()
              navigate(profile ? '/dashboard' : '/onboarding')
            }}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-charcoal px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-warmblack"
          >
            <FlaskConical className="h-3.5 w-3.5 text-orange-400" />
            Explore demo workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-amber-800/60">
            Demo mode is a local preview session, not a Firebase account. No credentials are stored.
          </p>
        </div>
      </div>
    </div>
  )
}
