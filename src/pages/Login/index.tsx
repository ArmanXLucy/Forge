import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from '../../features/auth/components/AuthLayout'
import { AuthConfigurationNotice } from '../../features/auth/components/AuthConfigurationNotice'
import { GoogleIcon } from '../../features/auth/components/GoogleIcon'
import { useAuth } from '../../features/auth/AuthContext'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import { Button } from '../../components/ui/Button'

export default function LoginPage() {
  const { signIn, signInWithGoogle, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const destination =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    if (!configured) {
      setFormError(
        'Firebase is not configured yet. Add your credentials to .env and restart the server, or use the demo workspace below.',
      )
      return
    }
    try {
      await signIn(values.email, values.password)
      toast.success('Welcome back.')
      navigate(destination, { replace: true })
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
      navigate(destination, { replace: true })
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
          Welcome
          <br />
          back<span className="text-orange-500">.</span>
        </>
      }
      subtitle="Log in to pick up where you left off — your missions, training and progress are waiting."
      image="/images/gallery6.jpg"
      imageAlt="Athlete training with a barbell"
      footer={
        <p className="text-center text-[13px] text-charcoal/55">
          New to Forge?{' '}
          <Link to="/signup" className="font-semibold text-charcoal underline decoration-orange-500 decoration-2 underline-offset-4 hover:text-orange-600">
            Create an account
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="field-error">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="mb-1.5 text-[11px] font-semibold text-charcoal/50 transition-colors hover:text-orange-600"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              className="field-input pr-12"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
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
          {errors.password && (
            <p id="password-error" className="field-error">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-charcoal/10" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/30">
          or continue with
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
      {!configured && (
        <p className="mt-2 text-center text-[10px] text-charcoal/35">
          Google sign-in becomes active once Firebase environment variables are provided.
        </p>
      )}
    </AuthLayout>
  )
}
