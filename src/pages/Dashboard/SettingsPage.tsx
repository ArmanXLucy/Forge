import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Database,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { PageHeader, DemoDataBadge } from '../../components/dashboard/ui'
import { Button, buttonClasses } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { useActivityStore } from '../../store/useActivityStore'
import { isFirebaseConfigured, missingFirebaseVariables } from '../../lib/firebase'
import { EXPERIENCE_LABELS, GOAL_LABELS, WEEKDAYS } from '../../lib/constants'
import { initials } from '../../lib/utils'
import type { UserPreferences } from '../../types'

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-[12px] font-semibold text-charcoal">{label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/40">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-charcoal/15'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, signOut, sendPasswordReset } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const resetAllData = useProfileStore((s) => s.resetAllData)
  const preferences = useActivityStore((s) => s.preferences)
  const setPreferences = useActivityStore((s) => s.setPreferences)
  const workouts = useActivityStore((s) => s.workouts)
  const meals = useActivityStore((s) => s.meals)
  const measurements = useActivityStore((s) => s.measurements)
  const lifestyle = useActivityStore((s) => s.lifestyle)
  const aiSessions = useActivityStore((s) => s.aiSessions)
  const clearActivity = useActivityStore((s) => s.clearActivity)
  const { completion, xp, completedMissions } = useProfileStats()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmActivityReset, setConfirmActivityReset] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const trainingDays = profile
    ? WEEKDAYS.filter((day) => profile.workoutDays.includes(day.value)).map((day) => day.short).join(' · ')
    : '—'

  const handlePasswordReset = async () => {
    if (!isFirebaseConfigured || !user?.email || user.isDemo) {
      toast.error('Password reset requires a configured Firebase account.')
      return
    }
    setSendingReset(true)
    try {
      await sendPasswordReset(user.email)
      toast.success(`Reset link sent to ${user.email}.`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSendingReset(false)
    }
  }

  const updateNotification = (key: keyof UserPreferences['notifications']) => {
    setPreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: !preferences.notifications[key],
      },
    })
  }

  const updatePrivacy = (key: keyof UserPreferences['privacy']) => {
    setPreferences({
      ...preferences,
      privacy: {
        ...preferences.privacy,
        [key]: !preferences.privacy[key],
      },
    })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleReset = () => {
    resetAllData()
    toast.success('Local demo data cleared.')
    navigate('/onboarding', { replace: true })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile, account security and understand exactly what this demo stores."
        actions={<DemoDataBadge label="Frontend demo" />}
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-charcoal font-display uppercase text-xl text-white">
                {initials(profile?.name ?? user?.displayName ?? 'Athlete')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display uppercase text-2xl leading-none text-charcoal">
                    {profile?.name ?? user?.displayName ?? 'Athlete'}
                  </h2>
                  {user?.isDemo && <Badge tone="orange">Demo</Badge>}
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-charcoal/45">
                  <Mail className="h-3 w-3" /> {user?.email ?? 'No email'}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-charcoal/30">
                  {completedMissions}/7 missions · {xp} XP · {completion}% complete
                </p>
              </div>
              <Link to="/onboarding" className={buttonClasses('outline', 'sm', 'shrink-0')}>
                <Pencil className="h-3.5 w-3.5" /> Edit Quick Start
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-charcoal/5 pt-5 sm:grid-cols-4">
              {[
                { label: 'Age', value: profile ? `${profile.age}` : '—' },
                { label: 'Height', value: profile ? `${profile.heightCm} cm` : '—' },
                { label: 'Weight', value: profile ? `${profile.weightKg} kg` : '—' },
                { label: 'Goal', value: profile ? GOAL_LABELS[profile.goal] : '—' },
                { label: 'Experience', value: profile ? EXPERIENCE_LABELS[profile.experience] : '—' },
                { label: 'Training days', value: trainingDays || '—' },
                { label: 'Storage', value: user?.isDemo ? 'Local demo' : 'Firebase auth' },
                { label: 'Profile', value: `${completion}% complete` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-charcoal/75">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-charcoal/30" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                Preferences & notifications
              </h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">
              Stored locally. These controls do not send push notifications in this frontend build.
            </p>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-ivory p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold text-charcoal">Preferred reminder time</p>
                <p className="mt-0.5 text-[9px] text-charcoal/35">Used as your planned training cue.</p>
              </div>
              <input
                type="time"
                value={preferences.reminderTime}
                onChange={(event) =>
                  setPreferences({ ...preferences, reminderTime: event.target.value })
                }
                aria-label="Preferred reminder time"
                className="min-h-[38px] rounded-lg border border-charcoal/15 bg-white px-3 text-[11px] font-semibold text-charcoal"
              />
            </div>
            <div className="mt-2 divide-y divide-charcoal/5">
              <ToggleRow
                label="Workout reminders"
                description="Show workout cues in the notification panel."
                checked={preferences.notifications.workoutReminders}
                onChange={() => updateNotification('workoutReminders')}
              />
              <ToggleRow
                label="Mission nudges"
                description="Prompt me when a profile mission is still open."
                checked={preferences.notifications.missionNudges}
                onChange={() => updateNotification('missionNudges')}
              />
              <ToggleRow
                label="Weekly review"
                description="Surface a weekly summary of training and recovery."
                checked={preferences.notifications.weeklyReview}
                onChange={() => updateNotification('weeklyReview')}
              />
            </div>
            <div className="mt-2 border-t border-charcoal/5 pt-1">
              <p className="flex items-center gap-1.5 pt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                <LockKeyhole className="h-3 w-3 text-orange-500" /> Privacy
              </p>
              <ToggleRow
                label="Product updates"
                description="Allow local product-update preferences. No email is sent in this demo."
                checked={preferences.privacy.productUpdates}
                onChange={() => updatePrivacy('productUpdates')}
              />
              <ToggleRow
                label="Local usage insights"
                description="Keep anonymised local interaction preferences on this device."
                checked={preferences.privacy.localAnalytics}
                onChange={() => updatePrivacy('localAnalytics')}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-charcoal/30" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                Account & security
              </h2>
            </div>
            <div className="mt-4 divide-y divide-charcoal/5">
              <div className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Password</p>
                  <p className="mt-0.5 text-[10px] text-charcoal/40">
                    {isFirebaseConfigured
                      ? 'Send a secure reset link to your account email.'
                      : 'Available once Firebase Authentication is configured.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={sendingReset}>
                  {sendingReset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  Send reset link
                </Button>
              </div>
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Session</p>
                  <p className="mt-0.5 text-[10px] text-charcoal/40">
                    Sign out of this device. Authentication persistence is managed by Firebase.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </Button>
              </div>
              <div className="flex flex-col gap-3 py-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Delete account</p>
                  <p className="mt-0.5 text-[10px] text-charcoal/40">
                    Reserved for Stage 2, where account deletion will also remove secure health data.
                  </p>
                </div>
                <span className="inline-flex min-h-[38px] cursor-not-allowed items-center gap-1.5 rounded-full border border-charcoal/10 px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                  <Trash2 className="h-3.5 w-3.5" /> Not available
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-charcoal/30" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                Data & privacy
              </h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-600/15 bg-emerald-50/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                  <Check className="h-3.5 w-3.5" /> Stored in this browser
                </p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-emerald-900/70">
                  <li>Quick Start basics (name, age, height, weight)</li>
                  <li>Mission status, completion timestamps and XP</li>
                  <li>Demo session flag (not a password or token)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-500/15 bg-red-50/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-800">
                  <ShieldCheck className="h-3.5 w-3.5" /> Never stored client-side
                </p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-red-900/70">
                  <li>Medical conditions, medications, allergies</li>
                  <li>Laboratory reports or health documents</li>
                  <li>Progress photographs and mission form answers</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-charcoal/10 bg-ivory p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Reset local demo data</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/45">
                    Clears your Quick Start profile and mission status from this browser. Your Firebase
                    account (if any) is unaffected.
                  </p>
                </div>
                {!confirmReset ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                    <RefreshCcw className="h-3.5 w-3.5" /> Reset data
                  </Button>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleReset}
                    >
                      Confirm reset
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-charcoal/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Local activity records</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/45">
                    {workouts.length} workouts · {meals.length} meals · {measurements.length} measurements ·{' '}
                    {lifestyle.length} recovery check-ins · {aiSessions.length} AI sessions
                  </p>
                </div>
                {!confirmActivityReset ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmActivityReset(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear activity
                  </Button>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmActivityReset(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        clearActivity()
                        setConfirmActivityReset(false)
                        toast.success('Local activity records cleared.')
                      }}
                    >
                      Confirm clear
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/30">
                This removes workouts, meals, water, measurements, recovery entries and AI sessions
                saved in this browser. Your profile and mission status are unchanged.
              </p>
            </div>

            <p className="mt-3 text-[9px] leading-relaxed text-charcoal/30">
              This is a frontend demo. Account deletion and secure medical-data export will be handled by
              the Stage 2 backend, not by browser storage.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-charcoal/30" />
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                  Firebase status
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] ${
                  isFirebaseConfigured
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isFirebaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {isFirebaseConfigured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            {isFirebaseConfigured ? (
              <div className="mt-4 space-y-2.5">
                <p className="text-[11px] leading-relaxed text-charcoal/50">
                  Firebase Authentication is initialised from environment variables. Email/password,
                  Google sign-in and password reset are active for non-demo accounts.
                </p>
                <div className="rounded-xl bg-emerald-50 p-3 text-[10px] leading-relaxed text-emerald-800">
                  Auth persistence and session management are handled by the Firebase modular SDK. No
                  tokens or passwords are stored manually by this app.
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-[11px] leading-relaxed text-charcoal/50">
                  Authentication is in demo mode. To enable real accounts, create a Firebase project,
                  enable Email/Password and Google providers, then add these variables to{' '}
                  <code className="rounded bg-ivory px-1 py-0.5 text-[10px]">.env</code>:
                </p>
                <ul className="mt-2 space-y-1">
                  {missingFirebaseVariables.map((variable) => (
                    <li
                      key={variable}
                      className="rounded bg-charcoal px-2 py-1 font-mono text-[9px] text-orange-300"
                    >
                      {variable}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[9px] leading-relaxed text-charcoal/35">
                  Restart the dev server after adding the values. See <code>.env.example</code> and the
                  README for full instructions.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-orange-500/25 bg-orange-50 p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-[12px] font-semibold text-orange-900">What this stage does not do</p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-orange-900/70">
                  <li>• No Node.js backend or PostgreSQL database.</li>
                  <li>• No secure medical-data storage.</li>
                  <li>• No personalised workout/nutrition engine.</li>
                  <li>• No generative AI chat. The AI Coach runs a local form classifier only.</li>
                </ul>
                <p className="mt-2 text-[10px] leading-relaxed text-orange-900/50">
                  These are intentionally reserved for Stages 2 and 3.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-charcoal p-5 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
              Need to update your programme?
            </p>
            <p className="mt-2 font-display uppercase text-xl leading-tight">
              Your coach is one message away.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Contact details are placeholders in this demo. Use the email link below to open your mail
              client.
            </p>
            <a
              href="mailto:hello@forge-athletic.ch"
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400 hover:text-orange-300"
            >
              hello@forge-athletic.ch <ArrowRight className="h-3 w-3" />
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
