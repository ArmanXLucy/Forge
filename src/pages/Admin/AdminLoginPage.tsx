import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../features/auth/AuthContext'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { FullScreenLoader } from '../../components/layout/RouteGuards'

export default function AdminLoginPage() {
  const { user, loading, signIn, signOut } = useAuth()
  const access = useAdminAccess()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (access.status === 'admin') navigate('/admin/overview', { replace: true })
  }, [access.status, navigate])

  if (loading) return <FullScreenLoader label="Checking admin session…" />
  if (access.status === 'admin') return <FullScreenLoader label="Opening admin workspace…" />

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (reason) {
      setError((reason as Error).message || 'Sign in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (user && access.status === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal px-5 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <Logo variant="light" />
          <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="mt-5 font-display text-3xl uppercase leading-none text-white">
            Admin access required
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-white/50">
            {access.error ?? 'This account does not have an administrator role.'}
          </p>
          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/40">
            Administrator access is provisioned manually. A Super Admin must create an
            <span className="text-white/70"> adminUsers/&lt;uid&gt; </span>
            record for this account.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white hover:bg-orange-600"
            >
              Sign out
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 hover:border-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> User dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen bg-charcoal lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.16),transparent_42%)]" />
        <div className="relative">
          <Logo variant="light" />
          <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
            Operations workspace
          </p>
          <h1 className="mt-4 max-w-lg font-display text-6xl uppercase leading-[0.88] text-white">
            Run the
            <br />
            Forge.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/45">
            Members, programming, support and AI monitoring in one secured administrative surface.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-3">
          {[
            ['Role-based access', 'Firestore-enforced permissions'],
            ['Live member data', 'Connected to the existing database'],
            ['Help Desk', 'One place for member support'],
            ['AI oversight', 'Model and session visibility'],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold text-white/80">{title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/35">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo variant="light" />
          </div>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">
            <ShieldCheck className="h-4 w-4" /> Admin sign in
          </div>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white">
            Admin workspace
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/40">
            Sign in with an administrator account. Normal member accounts are rejected.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="admin@forge-athletic.ch"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Password
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 pr-12 text-[14px] text-white placeholder:text-white/20 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-white/30 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-red-200">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? 'Verifying access' : 'Open admin workspace'}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[10px] text-white/30">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-white/60">
              <ArrowLeft className="h-3 w-3" /> Back to site
            </Link>
            <Link to="/login" className="hover:text-white/60">
              Member login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
