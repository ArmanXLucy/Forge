import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Info,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import { PageHeader, MissionStatusBadge } from '../../components/dashboard/ui'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Button, buttonClasses } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { MISSION_ICONS } from '../../components/navigation/dashboardNav'
import { MISSION_MAP, MISSIONS } from '../../data/missions'
import { useProfileStore } from '../../store/useProfileStore'
import { effectiveStatus, nextMission } from '../../utils/missions'
import { cn } from '../../lib/utils'
import type { MissionField } from '../../types'

type MissionValues = Record<string, string | number | boolean | string[]>

function buildDefaults(missionId: string): MissionValues {
  const mission = MISSION_MAP[missionId]
  const values: MissionValues = {}
  mission?.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'multiselect') values[field.id] = []
      else if (field.type === 'toggle') values[field.id] = false
      else if (field.type === 'scale') values[field.id] = field.min ?? 1
      else values[field.id] = ''
    })
  })
  return values
}

function DemoPhotoUploader() {
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  return (
    <div className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ivory text-charcoal/60">
          <Camera className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[13px] font-semibold text-charcoal">Optional progress photos</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-charcoal/45">
            Preview only. A selected photo is never uploaded or stored. Secure mission-photo storage
            is not enabled in this build.
          </p>
        </div>
      </div>
      {preview ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-ivory p-3">
          <img src={preview.url} alt="Local progress photo preview" className="h-16 w-16 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-charcoal">{preview.name}</p>
            <p className="mt-0.5 text-[10px] text-charcoal/40">Local preview · not uploaded</p>
          </div>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(preview.url)
              setPreview(null)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal/40 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove photo preview"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-4 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-ivory/60 p-4 text-center transition-colors hover:border-orange-500/50">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setPreview({ url: URL.createObjectURL(file), name: file.name })
            }}
          />
          <Camera className="h-5 w-5 text-charcoal/35" />
          <span className="mt-2 text-[11px] font-semibold text-charcoal/60">Choose a local image</span>
          <span className="mt-0.5 text-[10px] text-charcoal/35">JPG or PNG · preview only</span>
        </label>
      )}
    </div>
  )
}

export default function MissionDetailPage() {
  const { missionId = '' } = useParams()
  const mission = MISSION_MAP[missionId]
  const navigate = useNavigate()
  const progress = useProfileStore((s) => s.progress)
  const startMission = useProfileStore((s) => s.startMission)
  const completeMission = useProfileStore((s) => s.completeMission)
  const resetMission = useProfileStore((s) => s.resetMission)
  const setMissionFieldProgress = useProfileStore((s) => s.setMissionFieldProgress)
  const [reviewing, setReviewing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const defaultValues = useMemo(() => buildDefaults(missionId), [missionId])
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, touchedFields },
  } = useForm<MissionValues>({ defaultValues, mode: 'onTouched' })
  const watchedValues = watch()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [missionId])

  useEffect(() => {
    if (!mission) return
    const fields = mission.sections.flatMap((section) => section.fields)
    const answered = fields.filter((field) => {
      const value = watchedValues[field.id]
      const touched = Boolean((touchedFields as Record<string, boolean | undefined>)[field.id])
      if (field.type === 'toggle') return value === true
      if (Array.isArray(value)) return value.length > 0
      if (field.type === 'scale') return touched
      return typeof value === 'string'
        ? value.trim().length > 0
        : value !== undefined && value !== null
    }).length
    setMissionFieldProgress(mission.id, answered, fields.length)
  }, [mission, watchedValues, touchedFields, setMissionFieldProgress])

  if (!mission) return <Navigate to="/dashboard/missions" replace />

  const status = effectiveStatus(mission.id, progress)
  const isCompleted = status === 'completed'
  const Icon = MISSION_ICONS[mission.id] ?? Trophy
  const next = nextMission(progress)
  const showForm = !isCompleted || reviewing

  const finish = () => {
    startMission(mission.id)
    completeMission(mission.id)
    setConfirmOpen(false)
    setReviewing(false)
    toast.success(`${mission.title} complete — +${mission.xp} XP`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = () => {
    if (mission.sensitive) {
      setConfirmOpen(true)
      return
    }
    finish()
  }

  const saveForLater = () => {
    startMission(mission.id)
    toast.success('Mission marked in progress. Answers are not stored.')
  }

  const fieldError = (id: string) =>
    (errors as Record<string, { message?: string } | undefined>)[id]?.message

  const renderField = (field: MissionField) => {
    const error = fieldError(field.id)
    const requiredRule = field.required
      ? field.type === 'toggle'
        ? { validate: (value: unknown) => value === true || 'Please confirm to continue.' }
        : { required: field.type === 'multiselect' ? 'Select at least one option.' : 'This field is required.' }
      : {}

    const label = (
      <label htmlFor={field.id} className="field-label">
        {field.label}
        {field.required && <span className="ml-1 text-orange-500">*</span>}
      </label>
    )

    if (field.type === 'select') {
      return (
        <div key={field.id} className="sm:col-span-1">
          {label}
          <select
            id={field.id}
            className={cn('field-input', error && 'border-red-400')}
            aria-invalid={Boolean(error)}
            {...register(field.id, requiredRule)}
          >
            <option value="">Select an option…</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.help && <p className="mt-1 text-[10px] text-charcoal/35">{field.help}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="sm:col-span-2">
          {label}
          <textarea
            id={field.id}
            placeholder={field.placeholder}
            className={cn('field-textarea', error && 'border-red-400')}
            aria-invalid={Boolean(error)}
            {...register(field.id, requiredRule)}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    if (field.type === 'number') {
      return (
        <div key={field.id}>
          {label}
          <div className="relative">
            <input
              id={field.id}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={field.placeholder}
              className={cn('field-input pr-14', error && 'border-red-400')}
              aria-invalid={Boolean(error)}
              {...register(field.id, {
                ...requiredRule,
                valueAsNumber: true,
                ...(field.min !== undefined && {
                  min: { value: field.min, message: `Minimum is ${field.min}.` },
                }),
                ...(field.max !== undefined && {
                  max: { value: field.max, message: `Maximum is ${field.max}.` },
                }),
              })}
            />
            {field.unit && (
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/30">
                {field.unit}
              </span>
            )}
          </div>
          {field.help && <p className="mt-1 text-[10px] text-charcoal/35">{field.help}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    if (field.type === 'multiselect') {
      return (
        <div key={field.id} className="sm:col-span-2">
          {label}
          <Controller
            control={control}
            name={field.id}
            rules={
              field.required
                ? {
                    validate: (value) =>
                      (Array.isArray(value) && value.length > 0) || 'Select at least one option.',
                  }
                : {}
            }
            render={({ field: controlled }) => {
              const values = Array.isArray(controlled.value) ? controlled.value : []
              return (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((option) => {
                    const selected = values.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          controlled.onChange(
                            selected
                              ? values.filter((value) => value !== option.value)
                              : [...values, option.value],
                          )
                        }
                        className={cn(
                          'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-medium transition-colors',
                          selected
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-charcoal/15 bg-white text-charcoal/60 hover:border-charcoal/35',
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )
            }}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    if (field.type === 'scale') {
      return (
        <div key={field.id} className="sm:col-span-2">
          {label}
          <Controller
            control={control}
            name={field.id}
            render={({ field: controlled }) => {
              const min = field.min ?? 1
              const max = field.max ?? 10
              const current = Number(controlled.value)
              return (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => controlled.onChange(value)}
                        aria-pressed={current === value}
                        aria-label={`${field.label}: ${value}`}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg border text-[12px] font-semibold transition-colors',
                          current === value
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-charcoal/15 bg-white text-charcoal/55 hover:border-charcoal/35',
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </>
              )
            }}
          />
          {field.help && <p className="mt-1 text-[10px] text-charcoal/35">{field.help}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    if (field.type === 'toggle') {
      return (
        <div key={field.id} className="sm:col-span-2">
          <Controller
            control={control}
            name={field.id}
            rules={
              field.required
                ? { validate: (value) => value === true || 'Please confirm to continue.' }
                : {}
            }
            render={({ field: controlled }) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/12 bg-white p-4">
                <input
                  type="checkbox"
                  checked={Boolean(controlled.value)}
                  onChange={(event) => controlled.onChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-orange-500"
                />
                <span className="text-[12px] leading-relaxed text-charcoal/65">{field.label}</span>
              </label>
            )}
          />
          {error && <p className="field-error">{error}</p>}
        </div>
      )
    }

    return (
      <div key={field.id}>
        {label}
        <input
          id={field.id}
          type="text"
          placeholder={field.placeholder}
          className={cn('field-input', error && 'border-red-400')}
          aria-invalid={Boolean(error)}
          {...register(field.id, requiredRule)}
        />
        {field.help && <p className="mt-1 text-[10px] text-charcoal/35">{field.help}</p>}
        {error && <p className="field-error">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/dashboard/missions"
        className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40 transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All missions
      </Link>

      <PageHeader
        eyebrow={`Mission ${mission.number}`}
        title={mission.title}
        subtitle={mission.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MissionStatusBadge status={status} />
            <Badge tone="orange">
              <Sparkles className="h-3 w-3" /> +{mission.xp} XP
            </Badge>
            <Badge tone="muted">
              <Clock3 className="h-3 w-3" /> {mission.estimatedMinutes} min
            </Badge>
          </div>
        }
      />

      {!showForm ? (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-emerald-600/20 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ProgressRing
                value={100}
                size={104}
                strokeWidth={8}
                colorClassName="text-emerald-500"
                trackClassName="text-emerald-500/10"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </ProgressRing>
              <div>
                <p className="eyebrow text-emerald-700">Mission complete</p>
                <h2 className="mt-2 font-display uppercase text-3xl leading-none text-charcoal">
                  {mission.title} locked in<span className="text-orange-500">.</span>
                </h2>
                <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-charcoal/50">
                  Your status and XP have been updated. The answers you entered were intentionally not
                  stored because secure medical storage is not enabled.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReviewing(true)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={buttonClasses('dark', 'sm')}
              >
                Review / update answers
              </button>
              {next && next.id !== mission.id && (
                <Link to={`/dashboard/missions/${next.id}`} className={buttonClasses('outline', 'sm')}>
                  Next: {next.title} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  resetMission(mission.id)
                  setReviewing(true)
                  toast.success('Mission reopened.')
                }}
                className={buttonClasses('ghost', 'sm')}
              >
                Reset mission
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-charcoal/10 bg-white p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
              What happens next
            </p>
            <ul className="mt-4 space-y-4">
              {[
                'Your completion percentage and XP update immediately across the dashboard.',
                mission.sensitive
                  ? 'Sensitive answers are discarded in this build. Your coach can collect them securely outside this form.'
                  : 'Your answers stay in this session only and are not persisted.',
                'Advanced assessments unlock after all seven missions are complete.',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-charcoal/55">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
          <form onSubmit={handleSubmit(onSubmit, () => toast.error('Please check the highlighted fields.'))} noValidate>
            {mission.sensitive && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-50 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div>
                  <p className="text-[12px] font-semibold text-orange-900">
                    Sensitive mission — session only
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-orange-900/70">
                    Do not enter real medical documents or prescription details. Everything you type
                    here stays in this page memory and is discarded when you leave. Nothing is stored
                    in browser storage, Firestore or Supabase.
                  </p>
                </div>
              </div>
            )}

            {mission.id === 'health-profile' && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-relaxed text-amber-900/80">
                  <strong className="font-semibold">Safety prerequisite.</strong> Exercise and
                  nutrition recommendations cannot be finalised until health restrictions and medical
                  clearance have been reviewed. Speak to a qualified medical professional before
                  beginning intense training.
                </p>
              </div>
            )}

            {isCompleted && reviewing && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-600/20 bg-emerald-50 p-3.5 text-[11px] text-emerald-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                This mission is already complete. Submitting again refreshes its completion timestamp
                and does not duplicate XP.
              </div>
            )}

            <div className="space-y-4">
              {mission.sections.map((section, sectionIndex) => (
                <section
                  key={section.title}
                  className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-[10px] font-bold text-white">
                      {String(sectionIndex + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h2 className="text-[14px] font-semibold text-charcoal">{section.title}</h2>
                      {section.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-charcoal/45">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {section.fields.map((field) => renderField(field))}
                  </div>
                </section>
              ))}

              {mission.id === 'body-metrics' && <DemoPhotoUploader />}
            </div>

            <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-3 shadow-soft">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="px-1 text-[10px] leading-relaxed text-charcoal/35">
                  Answers are not persisted.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" size="sm" onClick={saveForLater}>
                    <Save className="h-3.5 w-3.5" /> Save for later
                  </Button>
                  <Button type="submit" size="sm">
                    {mission.sensitive ? 'Mark complete' : 'Complete mission'}
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-charcoal/10 bg-white p-5 lg:sticky lg:top-24">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal text-white">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Mission {mission.number}
              </p>
              <p className="mt-1 font-display uppercase text-xl leading-tight text-charcoal">
                Why we ask
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-charcoal/50">{mission.description}</p>
              <div className="mt-4 space-y-2.5 border-t border-charcoal/5 pt-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-charcoal/35">Estimated time</span>
                  <span className="font-semibold text-charcoal/60">{mission.estimatedMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-charcoal/35">Reward</span>
                  <span className="font-semibold text-orange-600">+{mission.xp} XP</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-charcoal/35">Storage</span>
                  <span className="font-semibold text-charcoal/60">
                    {mission.sensitive ? 'This page only' : 'Status only'}
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-ivory p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
                  <ShieldCheck className="h-3 w-3 text-orange-500" /> Privacy note
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">
                  {mission.sensitive
                    ? 'Medical data is never written to browser storage or Firestore.'
                    : 'Only status and XP persist; form answers are discarded.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <button
            type="button"
            aria-label="Close confirmation"
            onClick={() => setConfirmOpen(false)}
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal/35 hover:bg-ivory hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 id="confirm-title" className="mt-4 font-display uppercase text-2xl leading-none text-charcoal">
              Complete this mission?
            </h2>
            <p className="mt-2.5 text-[12px] leading-relaxed text-charcoal/55">
              This mission contains sensitive information. Your answers are discarded
              immediately — only the completion status and {mission.xp} XP are recorded. They are
              never written to Firestore, Supabase or browser storage.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </Button>
              <Button size="sm" onClick={finish}>
                Mark complete <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
