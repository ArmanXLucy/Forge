import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { AuthLayout } from '../../features/auth/components/AuthLayout'
import { useAuth } from '../../features/auth/AuthContext'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../../schemas/auth'
import { Button } from '../../components/ui/Button'

export default function ForgotPasswordPage() {
  const { sendPasswordReset, configured } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setError(null)
    if (!configured) {
      setError(
        'Password reset requires Firebase configuration. Add your credentials to .env and restart the server.',
      )
      return
    }
    try {
      await sendPasswordReset(values.email)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <AuthLayout
      title={
        <>
          Reset your
          <br />
          password<span className="text-orange-500">.</span>
        </>
      }
      subtitle="Enter the email address linked to your account. We will send a secure reset link."
      image="/images/coach.jpg"
      imageAlt="Coaching session on the studio floor"
      footer={
        <p className="text-center text-[13px] text-charcoal/55">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-semibold text-charcoal underline decoration-orange-500 decoration-2 underline-offset-4 hover:text-orange-600"
          >
            Back to login
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-emerald-900">Check your inbox</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-emerald-800/75">
            If an account exists for that email, a password reset link is on its way. Check your spam
            folder if it does not arrive within a few minutes.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800 hover:text-emerald-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to login
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[12px] text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="field-input pl-11"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
          <p className="mt-4 text-[11px] leading-relaxed text-charcoal/40">
            For security, we do not reveal whether an email address is registered.
          </p>
        </>
      )}
    </AuthLayout>
  )
}
