import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Cloud,
  Database,
  HardDrive,
  KeyRound,
  Loader2,
  LockKeyhole,
  LifeBuoy,
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
import { Avatar } from '../../components/ui/Avatar'
import { ProfilePhotoCard } from '../../components/settings/ProfilePhotoCard'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { useActivityStore } from '../../store/useActivityStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { useSupabaseStorageHealth } from '../../hooks/useSupabaseStorageHealth'
import { isFirebaseConfigured, missingFirebaseVariables } from '../../lib/firebase'
import { isFirestoreConfigured } from '../../lib/firestore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { isProfileImageStorageConfigured } from '../../services/cloud/storageService'
import { EXPERIENCE_LABELS, GOAL_LABELS, WEEKDAYS } from '../../lib/constants'
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

function StatusPill({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label ?? (ok ? 'Connected' : 'Not configured')}
    </span>
  )
}

export default function SettingsPage() {
  const { user, signOut, sendPasswordReset } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const avatarUrl = useProfileStore((s) => s.avatarUrl)
  const resetAllData = useProfileStore((s) => s.resetAllData)
  const syncStatus = useProfileStore((s) => s.syncStatus)
  const syncError = useProfileStore((s) => s.syncError)
  const lastSyncedAt = useProfileStore((s) => s.lastSyncedAt)
  const preferences = useActivityStore((s) => s.preferences)
  const setPreferences = useActivityStore((s) => s.setPreferences)
  const workouts = useActivityStore((s) => s.workouts)
  const meals = useActivityStore((s) => s.meals)
  const measurements = useActivityStore((s) => s.measurements)
  const lifestyle = useActivityStore((s) => s.lifestyle)
  const aiSessions = useActivityStore((s) => s.aiSessions)
  const clearActivity = useActivityStore((s) => s.clearActivity)
  const { isCloud } = useDataStatus()
  const storageHealth = useSupabaseStorageHealth()
  const { completion, xp, completedMissions } = useProfileStats()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmActivityReset, setConfirmActivityReset] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [clearingActivity, setClearingActivity] = useState(false)

  const name = profile?.name ?? user?.displayName ?? 'Athlete'
  const trainingDays = profile
    ? WEEKDAYS.filter((day) => profile.workoutDays.includes(day.value))
        .map((day) => day.short)
        .join(' · ')
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

  const handleResetProfile = () => {
    resetAllData()
    toast.success('Local profile cache cleared. Cloud records were not deleted.')
    navigate('/onboarding', { replace: true })
  }

  const handleClearActivity = async () => {
    setClearingActivity(true)
    try {
      await clearActivity()
      setConfirmActivityReset(false)
      toast.success(isCloud ? 'Activity records deleted from your account.' : 'Local activity records cleared.')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setClearingActivity(false)
    }
  }

  const syncLabel =
    syncStatus === 'synced'
      ? 'Synced'
      : syncStatus === 'saving'
        ? 'Saving'
        : syncStatus === 'loading'
          ? 'Connecting'
          : syncStatus === 'error'
            ? 'Sync issue'
            : 'Local only'

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile, photo, account security and connected data."
        actions={
          <DemoDataBadge
            label={user?.isDemo ? 'Demo workspace' : isCloud ? 'Cloud connected' : 'Local fallback'}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                src={avatarUrl ?? user?.photoURL}
                name={name}
                className="h-16 w-16 rounded-2xl border border-charcoal/10 text-xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display uppercase text-2xl leading-none text-charcoal">
                    {name}
                  </h2>
                  {user?.isDemo && <Badge tone="orange">Demo</Badge>}
                  {isCloud && <Badge tone="green">Cloud</Badge>}
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
                { label: 'Database', value: isCloud ? 'Firestore' : 'Local cache' },
                { label: 'Photos', value: storageHealth === 'ok' ? 'Supabase' : 'Not ready' },
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

          <ProfilePhotoCard storageReady={storageHealth === 'ok'} />

          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-charcoal/30" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                Preferences & notifications
              </h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">
              Saved to {isCloud ? 'Firestore and cached on this device' : 'this browser'}. These
              controls do not send push notifications in this build.
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
                description="Allow product-update preferences. No email is sent by this build."
                checked={preferences.privacy.productUpdates}
                onChange={() => updatePrivacy('productUpdates')}
              />
              <ToggleRow
                label="Usage insights"
                description="Keep anonymised interaction preferences for this account."
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
                  {sendingReset ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
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
                    Account deletion requires a trusted server operation because it must remove the
                    Firebase Auth user and every Firestore document.
                  </p>
                </div>
                <span className="inline-flex min-h-[38px] cursor-not-allowed items-center gap-1.5 rounded-full border border-charcoal/10 px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                  <Trash2 className="h-3.5 w-3.5" /> Server task
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
                  <Check className="h-3.5 w-3.5" /> {isCloud ? 'Stored in your account' : 'Kept in this browser'}
                </p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-emerald-900/70">
                  <li>Quick Start profile and goals</li>
                  <li>Mission status, completion timestamps and XP</li>
                  <li>Workouts, meals, water and measurements</li>
                  <li>Recovery check-ins, habits and AI session summaries</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-500/15 bg-red-50/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-800">
                  <ShieldCheck className="h-3.5 w-3.5" /> Never stored in Firestore
                </p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-red-900/70">
                  <li>Medical conditions, medications and allergies</li>
                  <li>Laboratory reports or health documents</li>
                  <li>Mission form answers and progress photographs</li>
                  <li>Camera frames or video</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-charcoal/10 bg-ivory p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">Reset local profile cache</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/45">
                    Clears the cached Quick Start profile and mission status in this browser. Cloud
                    records are not deleted.
                  </p>
                </div>
                {!confirmReset ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                    <RefreshCcw className="h-3.5 w-3.5" /> Reset cache
                  </Button>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleResetProfile}>
                      Confirm reset
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-charcoal/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-charcoal">
                    {isCloud ? 'Account activity records' : 'Local activity records'}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/45">
                    {workouts.length} workouts · {meals.length} meals · {measurements.length} measurements ·{' '}
                    {lifestyle.length} recovery check-ins · {aiSessions.length} AI sessions
                  </p>
                </div>
                {!confirmActivityReset ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmActivityReset(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> {isCloud ? 'Delete activity' : 'Clear activity'}
                  </Button>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmActivityReset(false)}
                      disabled={clearingActivity}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleClearActivity}
                      disabled={clearingActivity}
                    >
                      {clearingActivity && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isCloud ? 'Delete permanently' : 'Confirm clear'}
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/30">
                {isCloud
                  ? 'This deletes workouts, meals, water, measurements, recovery entries and AI sessions from Firestore and this device. Your profile and mission status are unchanged.'
                  : 'This removes workouts, meals, water, measurements, recovery entries and AI sessions saved in this browser. Your profile and mission status are unchanged.'}
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-charcoal/30" />
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                  Connected services
                </h2>
              </div>
              <StatusPill ok={isCloud} label={syncLabel} />
            </div>

            <div className="mt-4 divide-y divide-charcoal/5">
              <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div>
                  <p className="text-[11px] font-semibold text-charcoal">Firebase Authentication</p>
                  <p className="mt-0.5 text-[9px] text-charcoal/35">Email, Google and reset</p>
                </div>
                <StatusPill ok={isFirebaseConfigured} />
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[11px] font-semibold text-charcoal">Cloud Firestore</p>
                  <p className="mt-0.5 text-[9px] text-charcoal/35">Profiles and activity records</p>
                </div>
                <StatusPill ok={isCloud} label={isCloud ? 'Connected' : 'Local fallback'} />
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[11px] font-semibold text-charcoal">Supabase Storage</p>
                  <p className="mt-0.5 text-[9px] text-charcoal/35">Profile photo bucket</p>
                </div>
                <StatusPill
                  ok={storageHealth === 'ok'}
                  label={
                    storageHealth === 'ok'
                      ? 'Connected'
                      : storageHealth === 'checking'
                        ? 'Checking'
                        : storageHealth === 'missing-bucket'
                          ? 'Bucket missing'
                          : storageHealth === 'function-missing'
                            ? 'Upload function missing'
                            : storageHealth === 'error'
                              ? 'Unreachable'
                              : isProfileImageStorageConfigured
                                ? 'Configured'
                                : 'Not configured'
                  }
                />
              </div>
            </div>

            {isCloud ? (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[10px] leading-relaxed text-emerald-800">
                Your profile and activity are stored under your authenticated UID in Firestore, with a
                local cache for offline use.
                {lastSyncedAt && (
                  <span className="mt-1 block text-[9px] text-emerald-700/70">
                    Last sync {new Date(lastSyncedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">
                {isFirestoreConfigured
                  ? 'Cloud sync is not available yet. Data remains in this browser and will migrate once Firestore is reachable.'
                  : 'Firestore is not configured. Add the Firebase web config and enable Firestore in the Firebase console.'}
              </div>
            )}

            {(syncError || (syncStatus === 'error' && isFirestoreConfigured)) && (
              <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-[10px] leading-relaxed text-red-700">
                {syncError ?? 'Cloud sync failed. Data is still cached in this browser.'}
              </p>
            )}

            {!isFirebaseConfigured && (
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
            )}

            {!isSupabaseConfigured && (
              <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
                Add <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> to enable profile photo uploads. A service-role key
                must never be used in the browser.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-charcoal/30" />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-charcoal">
                What is stored where
              </h2>
            </div>
            <div className="mt-3 space-y-2.5 text-[10px] leading-relaxed text-charcoal/50">
              <p>
                <strong className="text-charcoal/80">Firestore</strong> stores structured profile,
                mission, workout, nutrition, progress, lifestyle, AI-summary and preference records.
              </p>
              <p>
                <strong className="text-charcoal/80">Supabase Storage</strong> stores only the profile
                image file. Firestore stores its URL and path.
              </p>
              <p>
                <strong className="text-charcoal/80">Browser cache</strong> keeps a copy for offline
                resilience and demo mode. Clearing it never deletes Firestore data.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-orange-500/25 bg-orange-50 p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div>
                <p className="text-[12px] font-semibold text-orange-900">Deliberate boundaries</p>
                <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-orange-900/70">
                  <li>• Medical and mission answers are never persisted.</li>
                  <li>• No email or push notification provider is connected.</li>
                  <li>• No generative AI chat. AI Coach runs local model inference only.</li>
                  <li>• Account deletion needs a trusted server operation.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-charcoal p-5 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-orange-400">
              Help & support
            </p>
            <p className="mt-2 font-display uppercase text-xl leading-tight">
              Need a hand with your programme?
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Open a private ticket in the Help Desk and the support team can pick it up from there.
            </p>
            <Link
              to="/dashboard/help-desk"
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400 hover:text-orange-300"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Open Help Desk <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
