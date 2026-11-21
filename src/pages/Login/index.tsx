import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { AuthLayout } from '../../features/auth/components/AuthLayout'
import { AuthConfigurationNotice } from '../../features/auth/components/AuthConfigurationNotice'
import { GoogleIcon } from '../../features/auth/components/GoogleIcon'
import { useAuth } from '../../features/auth/AuthContext'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import { Button } from '../../components/ui/Button'
import { auth } from '../../lib/firebase'
import { getAdminUser } from '../../services/cloud/adminRepository'

export default function LoginPage() {
  const { signIn, signInWithGoogle, signOut, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'admin' ? 'admin' : 'user'
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

  const switchMode = (next: 'user' | 'admin') => {
    setFormError(null)
    setShowPassword(false)
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'admin') nextParams.set('mode', 'admin')
    else nextParams.delete('mode')
    setSearchParams(nextParams, { replace: true })
  }

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    if (!configured) {
      setFormError(
        'Firebase is not configured yet. Add your credentials to .env and restart the server, or use the demo workspace below.',
      )
      return
    }
    let signedIn = false
    try {
      await signIn(values.email, values.password)
      signedIn = true
      if (mode === 'admin') {
        const uid = auth?.currentUser?.uid
        const admin = uid ? await getAdminUser(uid) : null
        if (!admin || !admin.active) {
          await signOut().catch(() => undefined)
          setFormError(
            `This account does not have an active administrator role.${uid ? ` Firebase UID: ${uid}.` : ''} Admin access is provisioned by a Super Admin.`,
          )
          return
        }
        toast.success('Admin workspace unlocked.')
        navigate('/admin/overview', { replace: true })
        return
      }
      toast.success('Welcome back.')
      navigate(destination, { replace: true })
    } catch (error) {
      if (mode === 'admin' && signedIn) await signOut().catch(() => undefined)
      const message = (error as Error).message
      if (mode === 'admin' && /permission|insufficient/i.test(message)) {
        setFormError(
          'Admin verification was blocked by the live Firestore rules. Publish the project firestore.rules, then try again.',
        )
        return
      }
      setFormError(message)
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
      topSlot={
        <div
          role="tablist"
          aria-label="Login type"
          className="relative grid grid-cols-2 rounded-full border border-charcoal/10 bg-charcoal/[0.045] p-1"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-[0_2px_10px_rgba(23,23,23,0.08)] transition-transform duration-300 ease-out ${
              mode === 'admin' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'user'}
            onClick={() => switchMode('user')}
            className={`relative z-10 flex min-h-[42px] items-center justify-center gap-2 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
              mode === 'user' ? 'text-charcoal' : 'text-charcoal/45 hover:text-charcoal/70'
            }`}
          >
            <UserRound className="h-4 w-4" /> User
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'admin'}
            onClick={() => switchMode('admin')}
            className={`relative z-10 flex min-h-[42px] items-center justify-center gap-2 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
              mode === 'admin' ? 'text-charcoal' : 'text-charcoal/45 hover:text-charcoal/70'
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Admin
          </button>
        </div>
      }
      title={
        mode === 'admin' ? (
          <>
            Admin
            <br />
            access<span className="text-orange-500">.</span>
          </>
        ) : (
          <>
            Welcome
            <br />
            back<span className="text-orange-500">.</span>
          </>
        )
      }
      subtitle={
        mode === 'admin'
          ? 'Sign in with an administrator account to open the operations workspace.'
          : 'Log in to pick up where you left off — your missions, training and progress are waiting.'
      }
      image="/images/gallery6.jpg"
      imageAlt="Athlete training with a barbell"
      footer={
        mode === 'admin' ? (
          <p className="rounded-xl border border-charcoal/8 bg-charcoal/[0.025] px-3.5 py-3 text-center text-[11px] leading-relaxed text-charcoal/45">
            Admin accounts are provisioned by a Super Admin. The Firestore document ID must match your Firebase UID.
          </p>
        ) : (
          <p className="text-center text-[13px] text-charcoal/55">
            New to Forge?{' '}
            <Link to="/signup" className="font-semibold text-charcoal underline decoration-orange-500 decoration-2 underline-offset-4 hover:text-orange-600">
              Create an account
            </Link>
          </p>
        )
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
              <Loader2 className="h-4 w-4 animate-spin" /> {mode === 'admin' ? 'Verifying access…' : 'Signing in…'}
            </>
          ) : mode === 'admin' ? (
            <>
              Open admin workspace <ShieldCheck className="h-4 w-4" />
            </>
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {mode === 'user' && (
        <>
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
        </>
      )}
    </AuthLayout>
  )
}
