import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from '../../features/auth/components/AuthLayout'
import { AuthConfigurationNotice } from '../../features/auth/components/AuthConfigurationNotice'
import { GoogleIcon } from '../../features/auth/components/GoogleIcon'
import { useAuth } from '../../features/auth/AuthContext'
import { passwordStrength, signupSchema, type SignupValues } from '../../schemas/auth'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'

const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

export default function SignupPage() {
  const { signUp, signInWithGoogle, configured } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as true,
    },
  })

  const password = watch('password')
  const strength = passwordStrength(password || '')

  const onSubmit = async (values: SignupValues) => {
    setFormError(null)
    if (!configured) {
      setFormError(
        'Firebase is not configured yet. Add your credentials to .env and restart the server, or explore the demo workspace below.',
      )
      return
    }
    try {
      await signUp(values.name, values.email, values.password)
      toast.success('Account created. Let’s build your profile.')
      navigate('/onboarding', { replace: true })
    } catch (error) {
      setFormError((error as Error).message)
    }
  }

  const onGoogle = async () => {
    setFormError(null)
    if (!configured) {
      setFormError('Google sign-in requires Firebase configuration.')
      return
    }
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Signed in with Google.')
      navigate('/onboarding', { replace: true })
    } catch (error) {
      setFormError((error as Error).message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout
      title={
        <>
          Forge your
          <br />
          stronger self<span className="text-orange-500">.</span>
        </>
      }
      subtitle="Create your account, complete a two-minute Quick Start, and step into a coaching plan built around you."
      image="/images/gallery4.jpg"
      imageAlt="Athlete hanging from a pull-up bar during training"
      footer={
        <p className="text-center text-[13px] text-charcoal/55">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-charcoal underline decoration-orange-500 decoration-2 underline-offset-4 hover:text-orange-600"
          >
            Log in
          </Link>
        </p>
      }
    >
      <AuthConfigurationNotice />

      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[12px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
        <div>
          <label htmlFor="name" className="field-label">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Alex Morgan"
            className="field-input"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="field-input"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="field-input pr-12"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-charcoal/40 hover:text-charcoal"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      index < strength
                        ? strength <= 1
                          ? 'bg-red-400'
                          : strength === 2
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        : 'bg-charcoal/10',
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-charcoal/40">
                {strengthLabels[strength]}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-charcoal/35">8+ characters, with a number.</p>
          )}
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className="field-input"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-charcoal/55">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-charcoal/25 text-orange-500 accent-orange-500"
              aria-invalid={Boolean(errors.acceptTerms)}
              {...register('acceptTerms')}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-charcoal underline underline-offset-2">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-charcoal underline underline-offset-2">
                Privacy Policy
              </Link>
              , and understand this is a demo application.
            </span>
          </label>
          {errors.acceptTerms && <p className="field-error">{errors.acceptTerms.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-charcoal/10" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/30">
          or sign up with
        </span>
        <span className="h-px flex-1 bg-charcoal/10" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full border border-charcoal/15 bg-white text-[12px] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-charcoal/35 disabled:opacity-60"
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Google
      </button>
    </AuthLayout>
  )
}
