import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Dumbbell,
  LogOut,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { Logo } from '../../components/ui/Logo'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore } from '../../store/useProfileStore'
import { quickStartSchema, type QuickStartValues } from '../../schemas/quickStart'
import {
  EXPERIENCE_LABELS,
  EXPERIENCE_NOTES,
  GOAL_LABELS,
  GOAL_OPTIONS,
  WEEKDAYS,
} from '../../lib/constants'
import { cn } from '../../lib/utils'
import type { ExperienceLevel, FitnessGoal } from '../../types'

const steps = [
  { id: 0, label: 'The basics', icon: UserRound },
  { id: 1, label: 'Your body', icon: Ruler },
  { id: 2, label: 'Your goal', icon: Target },
  { id: 3, label: 'Your rhythm', icon: Dumbbell },
]

const stepFields: Array<Array<keyof QuickStartValues>> = [
  ['name', 'age'],
  ['heightCm', 'weightKg'],
  ['goal'],
  ['experience', 'workoutDays'],
]

export default function OnboardingPage() {
  const { user, signOut } = useAuth()
  const storeProfile = useProfileStore((s) => s.profile)
  const saveQuickStart = useProfileStore((s) => s.saveQuickStart)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState<QuickStartValues | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickStartValues>({
    resolver: zodResolver(quickStartSchema),
    mode: 'onTouched',
    defaultValues: {
      name: storeProfile?.name ?? user?.displayName ?? '',
      age: storeProfile?.age ?? ('' as unknown as number),
      heightCm: storeProfile?.heightCm ?? ('' as unknown as number),
      weightKg: storeProfile?.weightKg ?? ('' as unknown as number),
      goal: (storeProfile?.goal ?? '') as FitnessGoal,
      experience: (storeProfile?.experience ?? '') as ExperienceLevel,
      workoutDays: storeProfile?.workoutDays ?? [],
    },
  })

  const selectedGoal = watch('goal')
  const selectedExperience = watch('experience')
  const selectedDays = watch('workoutDays') ?? []

  const next = async () => {
    const valid = await trigger(stepFields[step], { shouldFocus: true })
    if (valid) {
      setStep((value) => Math.min(value + 1, steps.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const previous = () => {
    setStep((value) => Math.max(value - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleDay = (day: number) => {
    const isSelected = selectedDays.includes(day)
    const nextDays = isSelected
      ? selectedDays.filter((value) => value !== day)
      : [...selectedDays, day].sort((a, b) => a - b)
    setValue('workoutDays', nextDays, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = (values: QuickStartValues) => {
    saveQuickStart({
      ...values,
      completedAt: new Date().toISOString(),
    })
    setCompleted(values)
    toast.success('Quick Start complete — +50 XP')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const progress = completed ? 100 : ((step + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-ivory">
      <div className="grid min-h-screen lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <aside className="relative hidden overflow-hidden bg-charcoal text-white lg:flex lg:flex-col">
          <div className="absolute inset-0">
            <img
              src="/images/gallery6.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/90 to-charcoal" />
          </div>
          <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
            <Link to="/">
              <Logo variant="light" />
            </Link>

            <div className="mt-14">
              <p className="eyebrow-light">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Quick Start
              </p>
              <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] xl:text-5xl">
                Your first
                <br />
                two minutes<span className="text-orange-500">.</span>
              </h1>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/50">
                Seven essential details. No long questionnaire. Deeper missions unlock from your
                dashboard, at your pace.
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/40">
                <span>Step {completed ? steps.length : step + 1} of {steps.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="mt-8 space-y-1">
                {steps.map((item) => {
                  const isDone = completed ? true : item.id < step
                  const isActive = !completed && item.id === step
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                        isActive && 'bg-white/[0.06]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-[10px]',
                          isDone && 'border-orange-500 bg-orange-500 text-white',
                          isActive && 'border-orange-500 text-orange-400',
                          !isDone && !isActive && 'border-white/15 text-white/25',
                        )}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : <item.icon className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={cn(
                          'text-[12px] font-semibold uppercase tracking-[0.12em]',
                          isActive || isDone ? 'text-white' : 'text-white/30',
                        )}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 animate-pulse-dot rounded-full bg-orange-500" />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-auto space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-orange-400">
                  <Clock3 className="h-3 w-3" /> About 2 minutes
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                  Only non-sensitive basics are stored locally in this frontend demo. Health details
                  are collected later and never persisted client-side.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 transition-colors hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <Link to="/" className="lg:hidden">
              <Logo />
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/35 sm:block">
                {completed ? 'Complete' : `Step ${step + 1} / ${steps.length}`}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-[40px] items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40 hover:text-charcoal lg:hidden"
              >
                <LogOut className="h-3.5 w-3.5" /> Exit
              </button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-5 pb-14 pt-2 sm:px-8 lg:px-10">
            {completed ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-white shadow-glow">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <p className="eyebrow mt-7">
                  <span className="h-px w-6 bg-current" /> Quick Start complete
                </p>
                <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] text-charcoal sm:text-5xl">
                  You&apos;re in,
                  <br />
                  {completed.name.split(' ')[0]}
                  <span className="text-orange-500">.</span>
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-charcoal/55">
                  Your baseline is saved. Next, your dashboard will recommend the highest-impact
                  mission to personalise your training and nutrition.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3 rounded-2xl border border-charcoal/10 bg-white p-5 sm:grid-cols-4">
                  {[
                    { label: 'Goal', value: GOAL_LABELS[completed.goal] },
                    { label: 'Experience', value: EXPERIENCE_LABELS[completed.experience] },
                    { label: 'Height', value: `${completed.heightCm} cm` },
                    { label: 'Weight', value: `${completed.weightKg} kg` },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-charcoal/35">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-charcoal">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-3 text-[12px] font-medium text-orange-800">
                  <Sparkles className="h-4 w-4" /> +50 XP · First Step achievement unlocked
                </div>

                <Button className="mt-7 w-full sm:w-auto" onClick={() => navigate('/dashboard', { replace: true })}>
                  Enter your dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <p className="eyebrow">
                  <span className="h-px w-6 bg-current" /> Quick Start
                </p>

                <div className="mt-2 mb-6 flex gap-1.5 lg:hidden" aria-hidden="true">
                  {steps.map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        item.id <= step ? 'bg-orange-500' : 'bg-charcoal/10',
                      )}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {step === 0 && (
                      <div>
                        <h2 className="font-display text-4xl uppercase leading-none text-charcoal sm:text-5xl">
                          First, the basics<span className="text-orange-500">.</span>
                        </h2>
                        <p className="mt-3 text-sm text-charcoal/50">
                          So your coach knows who they are writing for.
                        </p>

                        <div className="mt-8 space-y-5">
                          <div>
                            <label htmlFor="name" className="field-label">
                              What should we call you?
                            </label>
                            <input
                              id="name"
                              type="text"
                              autoComplete="given-name"
                              placeholder="Alex Morgan"
                              className="field-input"
                              aria-invalid={Boolean(errors.name)}
                              {...register('name')}
                            />
                            {errors.name && <p className="field-error">{errors.name.message}</p>}
                          </div>
                          <div>
                            <label htmlFor="age" className="field-label">
                              Age
                            </label>
                            <div className="relative">
                              <input
                                id="age"
                                type="number"
                                inputMode="numeric"
                                placeholder="e.g. 32"
                                className="field-input pr-14"
                                aria-invalid={Boolean(errors.age)}
                                {...register('age')}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/30">
                                years
                              </span>
                            </div>
                            {errors.age && <p className="field-error">{errors.age.message}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 1 && (
                      <div>
                        <h2 className="font-display text-4xl uppercase leading-none text-charcoal sm:text-5xl">
                          Now, your body<span className="text-orange-500">.</span>
                        </h2>
                        <p className="mt-3 text-sm text-charcoal/50">
                          A starting point — not a judgement. You can update this any time.
                        </p>

                        <div className="mt-8 grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor="heightCm" className="field-label">
                              Height
                            </label>
                            <div className="relative">
                              <input
                                id="heightCm"
                                type="number"
                                inputMode="decimal"
                                placeholder="e.g. 178"
                                className="field-input pr-12"
                                aria-invalid={Boolean(errors.heightCm)}
                                {...register('heightCm')}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/30">
                                cm
                              </span>
                            </div>
                            {errors.heightCm && <p className="field-error">{errors.heightCm.message}</p>}
                          </div>
                          <div>
                            <label htmlFor="weightKg" className="field-label">
                              Current weight
                            </label>
                            <div className="relative">
                              <input
                                id="weightKg"
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                placeholder="e.g. 78.4"
                                className="field-input pr-12"
                                aria-invalid={Boolean(errors.weightKg)}
                                {...register('weightKg')}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal/30">
                                kg
                              </span>
                            </div>
                            {errors.weightKg && <p className="field-error">{errors.weightKg.message}</p>}
                          </div>
                        </div>

                        <div className="mt-6 flex items-start gap-3 rounded-xl border border-charcoal/10 bg-white p-4">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                          <p className="text-[11px] leading-relaxed text-charcoal/50">
                            These basic figures are saved locally so your dashboard can resume. Health
                            conditions, medications and medical details are never stored in this
                            frontend build.
                          </p>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <h2 className="font-display text-4xl uppercase leading-none text-charcoal sm:text-5xl">
                          What are we building<span className="text-orange-500">?</span>
                        </h2>
                        <p className="mt-3 text-sm text-charcoal/50">
                          Choose the outcome that matters most right now. You can add secondary goals
                          later.
                        </p>

                        <div className="mt-7 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Primary fitness goal">
                          {GOAL_OPTIONS.map((option) => {
                            const isSelected = selectedGoal === option.value
                            return (
                              <label
                                key={option.value}
                                className={cn(
                                  'flex min-h-[64px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all',
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_0_1px_#F97316]'
                                    : 'border-charcoal/12 bg-white hover:border-charcoal/30',
                                )}
                              >
                                <input
                                  type="radio"
                                  value={option.value}
                                  className="sr-only"
                                  {...register('goal')}
                                />
                                <span>
                                  <span
                                    className={cn(
                                      'block text-[13px] font-semibold',
                                      isSelected ? 'text-charcoal' : 'text-charcoal/70',
                                    )}
                                  >
                                    {option.label}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-charcoal/35">
                                    {option.value === 'fat-loss' && 'Lose fat, keep strength'}
                                    {option.value === 'build-muscle' && 'Add size and definition'}
                                    {option.value === 'get-stronger' && 'Measurable strength gains'}
                                    {option.value === 'endurance' && 'Go longer, recover faster'}
                                    {option.value === 'general-health' && 'Feel better day to day'}
                                    {option.value === 'longevity' && 'Train for decades'}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                    isSelected
                                      ? 'border-orange-500 bg-orange-500 text-white'
                                      : 'border-charcoal/20',
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        {errors.goal && <p className="field-error">{errors.goal.message}</p>}
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <h2 className="font-display text-4xl uppercase leading-none text-charcoal sm:text-5xl">
                          How do you train<span className="text-orange-500">?</span>
                        </h2>
                        <p className="mt-3 text-sm text-charcoal/50">
                          Experience and available days set the shape of your first programme.
                        </p>

                        <div className="mt-7 space-y-2.5" role="radiogroup" aria-label="Training experience">
                          {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((value) => {
                            const isSelected = selectedExperience === value
                            return (
                              <label
                                key={value}
                                className={cn(
                                  'flex min-h-[58px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all',
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_0_1px_#F97316]'
                                    : 'border-charcoal/12 bg-white hover:border-charcoal/30',
                                )}
                              >
                                <input
                                  type="radio"
                                  value={value}
                                  className="sr-only"
                                  {...register('experience')}
                                />
                                <span>
                                  <span className="block text-[13px] font-semibold text-charcoal/80">
                                    {EXPERIENCE_LABELS[value]}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-charcoal/35">
                                    {EXPERIENCE_NOTES[value]}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                    isSelected
                                      ? 'border-orange-500 bg-orange-500 text-white'
                                      : 'border-charcoal/20',
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        {errors.experience && <p className="field-error">{errors.experience.message}</p>}

                        <div className="mt-7">
                          <p className="field-label">Which days can you train?</p>
                          <p className="mb-3 text-[11px] text-charcoal/40">Choose at least two.</p>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((day) => {
                              const isSelected = selectedDays.includes(day.value)
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleDay(day.value)}
                                  aria-pressed={isSelected}
                                  aria-label={day.label}
                                  className={cn(
                                    'flex h-12 min-w-[54px] flex-col items-center justify-center rounded-xl border text-[11px] font-bold uppercase transition-all',
                                    isSelected
                                      ? 'border-orange-500 bg-orange-500 text-white'
                                      : 'border-charcoal/12 bg-white text-charcoal/50 hover:border-charcoal/30',
                                  )}
                                >
                                  {day.short}
                                  {isSelected && <Check className="mt-0.5 h-2.5 w-2.5" />}
                                </button>
                              )
                            })}
                          </div>
                          {errors.workoutDays && (
                            <p className="field-error">{errors.workoutDays.message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-9 flex items-center justify-between gap-3 border-t border-charcoal/10 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={previous}
                    disabled={step === 0}
                    className={cn('px-4', step === 0 && 'invisible')}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={next} className="min-w-[150px]">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="min-w-[190px]">
                      {isSubmitting ? 'Saving…' : 'Complete Quick Start'}
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-center text-[10px] text-charcoal/30">
                  {storeProfile
                    ? 'You can update these basics later in Settings.'
                    : 'About 1–2 minutes · progress saved only after completion'}
                </p>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
