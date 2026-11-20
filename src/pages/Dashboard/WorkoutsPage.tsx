import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  Flame,
  Layers,
  Play,
  Repeat2,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PageHeader,
  SectionCard,
  SourceBadge,
  StatCard,
} from '../../components/dashboard/ui'
import { buttonClasses } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { WorkoutPlayer, type WorkoutResult } from '../../components/dashboard/WorkoutPlayer'
import { WORKOUTS } from '../../data/dashboard'
import { WEEKDAYS } from '../../lib/constants'
import { useActivityStore } from '../../store/useActivityStore'
import { useProfileStore } from '../../store/useProfileStore'
import {
  addDays,
  dateKey,
  formatMinutes,
  relativeTime,
  startOfWeek,
  workoutsForWeek,
} from '../../utils/activity'
import { cn } from '../../lib/utils'
import type { WorkoutSession } from '../../types'

const planLibrary = [
  {
    id: 'foundation',
    name: 'Foundation Strength',
    phase: 'Weeks 1–8',
    frequency: '3 days / week',
    focus: 'Squat · Hinge · Push · Pull',
    description: 'A full-body base-building block focused on technique, joint resilience and gradual load.',
    tag: 'Current plan',
    active: true,
  },
  {
    id: 'hybrid',
    name: 'Hybrid Engine',
    phase: 'Weeks 9–16',
    frequency: '4 days / week',
    focus: 'Strength + Zone 2',
    description: 'Strength maintenance paired with aerobic development for hybrid athletes.',
    tag: 'Up next',
    active: false,
  },
  {
    id: 'rebuild',
    name: 'Rebuild & Recover',
    phase: 'Optional block',
    frequency: '2–3 days / week',
    focus: 'Mobility · Tissue quality',
    description: 'A lower-load block for travel weeks, return-to-training or deload periods.',
    tag: 'Template',
    active: false,
  },
]

function dayName(weekday: number) {
  return WEEKDAYS.find((day) => day.value === weekday)?.short ?? '—'
}

export default function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const workouts = useActivityStore((s) => s.workouts)
  const addWorkout = useActivityStore((s) => s.addWorkout)
  const profile = useProfileStore((s) => s.profile)
  const [expanded, setExpanded] = useState<string | null>(WORKOUTS[0].id)
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null)

  const today = new Date()
  const weekStart = startOfWeek(today)
  const completedKeys = new Set(workouts.map((workout) => dateKey(new Date(workout.completedAt))))
  const weekWorkouts = workoutsForWeek(workouts)
  const plannedWorkouts = WORKOUTS.filter((workout) => workout.status !== 'completed')
  const plannedToday =
    plannedWorkouts.find((workout) => workout.weekday === today.getDay()) ?? null
  const nextPlanned =
    plannedToday ??
    plannedWorkouts
      .slice()
      .sort((a, b) => ((a.weekday - today.getDay() + 7) % 7) - ((b.weekday - today.getDay() + 7) % 7))[0] ??
    WORKOUTS[0]

  const weekMinutes = formatMinutes(
    weekWorkouts.reduce((sum, workout) => sum + workout.durationSeconds, 0),
  )
  const adherence = plannedWorkouts.length
    ? Math.min(100, Math.round((weekWorkouts.length / plannedWorkouts.length) * 100))
    : 0

  useEffect(() => {
    const startId = searchParams.get('start')
    if (!startId) return
    const selected = WORKOUTS.find((workout) => workout.id === startId)
    if (selected) {
      setActiveWorkout(selected)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openWorkout = (workout: WorkoutSession) => {
    setActiveWorkout(workout)
    setExpanded(workout.id)
  }

  const handleSave = (result: WorkoutResult) => {
    if (!activeWorkout) return
    addWorkout({
      workoutId: activeWorkout.id,
      title: activeWorkout.title,
      focus: activeWorkout.focus,
      completedAt: new Date().toISOString(),
      durationSeconds: result.durationSeconds,
      exercisesCompleted: result.exercisesCompleted,
      totalExercises: result.totalExercises,
      source: 'plan',
    })
    toast.success('Workout saved on this device.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Training"
        title="Workout plans"
        subtitle="A structured week built around strength, recovery and the days you actually have available."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/missions/training-history" className={buttonClasses('outline', 'sm')}>
              Update training profile
            </Link>
            <button
              type="button"
              onClick={() => openWorkout(nextPlanned)}
              className={buttonClasses('primary', 'sm')}
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Start workout
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Check}
          label="Sessions this week"
          value={weekWorkouts.length}
          suffix={`/ ${plannedWorkouts.length}`}
          note="saved on this device"
          accent
          source={weekWorkouts.length ? 'local' : 'empty'}
        />
        <StatCard
          icon={Clock3}
          label="Training time"
          value={weekMinutes}
          suffix="min"
          note="this week"
          source={weekWorkouts.length ? 'local' : 'empty'}
        />
        <StatCard
          icon={Layers}
          label="Plan block"
          value="8"
          suffix="weeks"
          note="Foundation programme"
          source="sample"
        />
        <StatCard
          icon={Target}
          label="Plan adherence"
          value={adherence}
          suffix="%"
          note={`${plannedWorkouts.length} planned sessions`}
          source={weekWorkouts.length ? 'local' : 'empty'}
        />
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl bg-charcoal text-white">
        <div className="grid lg:grid-cols-[1.25fr_1fr]">
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
                <Play className="h-2.5 w-2.5 fill-current" /> {plannedToday ? 'Today' : `Next · ${dayName(nextPlanned.weekday)}`}
              </span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/50">
                {nextPlanned.intensity} intensity
              </span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/50">
                {nextPlanned.duration} min
              </span>
              <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-orange-400">
                Sample plan
              </span>
            </div>
            <h2 className="mt-4 font-display uppercase text-3xl leading-none sm:text-4xl">
              {nextPlanned.title}
            </h2>
            <p className="mt-2 text-[13px] text-white/50">{nextPlanned.focus}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Exercises</p>
                <p className="mt-1 font-display uppercase text-xl">{nextPlanned.exercises.length}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Working sets</p>
                <p className="mt-1 font-display uppercase text-xl">
                  {nextPlanned.exercises.reduce((sum, exercise) => {
                    const sets = Number.parseInt(exercise.sets, 10)
                    return sum + (Number.isFinite(sets) ? sets : 1)
                  }, 0)}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">Last session</p>
                <p className="mt-1 font-display uppercase text-xl">
                  {workouts.length ? relativeTime(workouts[0].completedAt) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openWorkout(nextPlanned)}
                className={buttonClasses('primary', 'sm')}
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Start session
              </button>
              <button
                type="button"
                onClick={() => setExpanded(expanded === nextPlanned.id ? null : nextPlanned.id)}
                className={buttonClasses('outline-light', 'sm')}
              >
                {expanded === nextPlanned.id ? 'Hide plan' : 'Preview exercises'}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    expanded === nextPlanned.id && 'rotate-180',
                  )}
                />
              </button>
            </div>
          </div>
          <div className="relative hidden overflow-hidden lg:block">
            <img
              src="/images/gallery6.jpg"
              alt="Athlete performing a barbell squat"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/30 to-transparent" />
          </div>
        </div>

        {expanded === nextPlanned.id && (
          <div className="border-t border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                Session plan
              </p>
              <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                Demo template
              </span>
            </div>
            <ul className="mt-3 divide-y divide-white/10">
              {nextPlanned.exercises.map((exercise, index) => (
                <li key={exercise.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="w-5 text-[10px] font-bold text-white/25">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-[140px] flex-1 text-[13px] font-semibold text-white">
                    {exercise.name}
                  </span>
                  <span className="text-[11px] text-white/45">{exercise.focus}</span>
                  <span className="ml-auto text-[11px] font-semibold text-orange-400">
                    {exercise.sets} × {exercise.reps}
                  </span>
                  <span className="w-16 text-right text-[10px] text-white/30">{exercise.rest}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
              Week at a glance
            </p>
            <p className="mt-1 text-[11px] text-charcoal/40">
              Planned sessions, with completed days marked from your local history.
            </p>
          </div>
          <SourceBadge source="local" label="Local + sample plan" />
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAYS.map((day) => {
            const session = WORKOUTS.find((workout) => workout.weekday === day.value)
            const isToday = day.value === today.getDay()
            const dayDate = addDays(weekStart, day.value === 0 ? 6 : day.value - 1)
            const completed = completedKeys.has(dateKey(dayDate))
            return (
              <div
                key={day.value}
                className={cn(
                  'flex min-h-[96px] flex-col items-center justify-between rounded-xl border p-2 text-center sm:min-h-[108px] sm:p-2.5',
                  isToday
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : session
                      ? 'border-charcoal/10 bg-ivory'
                      : 'border-charcoal/5 bg-charcoal/[0.02]',
                )}
              >
                <span
                  className={cn(
                    'text-[9px] font-bold uppercase tracking-[0.08em]',
                    isToday ? 'text-white/75' : 'text-charcoal/35',
                  )}
                >
                  {day.short}
                </span>
                {session ? (
                  <>
                    <span
                      className={cn(
                        'my-1 flex h-8 w-8 items-center justify-center rounded-full',
                        isToday ? 'bg-white/15' : 'bg-white',
                      )}
                    >
                      {completed ? (
                        <Check className={cn('h-3.5 w-3.5', isToday ? 'text-white' : 'text-emerald-600')} />
                      ) : (
                        <Dumbbell className={cn('h-3.5 w-3.5', isToday ? 'text-white' : 'text-orange-600')} />
                      )}
                    </span>
                    <span
                      className={cn(
                        'hidden text-[8px] leading-tight sm:block',
                        isToday ? 'text-white/70' : 'text-charcoal/40',
                      )}
                    >
                      {session.title.split('—')[0].trim()}
                    </span>
                  </>
                ) : (
                  <span className="my-2 text-[8px] uppercase tracking-[0.08em] text-charcoal/20">
                    Rest
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-charcoal/30">
          The weekly template is sample content. Completed markers are based on sessions you save locally.
        </p>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard
          eyebrow="Upcoming sessions"
          title="Preview or start a session."
          action={<SourceBadge source="sample" label="Sample templates" />}
        >
          <div className="space-y-2.5">
            {plannedWorkouts.map((workout) => (
              <article key={workout.id} className="overflow-hidden rounded-xl border border-charcoal/10">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === workout.id ? null : workout.id)}
                  className="flex w-full items-center gap-3 p-3.5 text-left"
                  aria-expanded={expanded === workout.id}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      workout.weekday === today.getDay()
                        ? 'bg-orange-500 text-white'
                        : 'bg-ivory text-charcoal/60',
                    )}
                  >
                    <Dumbbell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-charcoal">
                        {workout.title}
                      </span>
                      {workout.weekday === today.getDay() && (
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-orange-700">
                          Today
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-charcoal/40">
                      {dayName(workout.weekday)} · {workout.focus} · {workout.duration} min
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-charcoal/30 transition-transform',
                      expanded === workout.id && 'rotate-180',
                    )}
                  />
                </button>
                {expanded === workout.id && (
                  <div className="border-t border-charcoal/5 bg-ivory/50 px-3.5 py-3">
                    <ul className="space-y-2">
                      {workout.exercises.map((exercise) => (
                        <li key={exercise.name} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="font-medium text-charcoal/70">{exercise.name}</span>
                          <span className="shrink-0 text-charcoal/40">
                            {exercise.sets} × {exercise.reps}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => openWorkout(workout)}
                      className={buttonClasses('dark', 'sm', 'mt-3 w-full')}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Start this session
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Plan library"
          title="Programme blocks"
          action={<Repeat2 className="h-4 w-4 text-charcoal/25" />}
        >
          <div className="space-y-3">
            {planLibrary.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  'rounded-xl border p-4',
                  plan.active ? 'border-orange-500/25 bg-orange-500/[0.04]' : 'border-charcoal/10',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-semibold text-charcoal">{plan.name}</p>
                  <Badge tone={plan.active ? 'orange' : 'muted'}>{plan.tag}</Badge>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-charcoal/35">
                  {plan.phase} · {plan.frequency}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-charcoal/45">{plan.description}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
                  {plan.focus}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-ivory p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/45">
              <Check className="h-3.5 w-3.5 text-orange-500" /> Sample templates
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">
              These are sample plans, not generated programming. Your saved sessions are real local records.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Workout history"
        title={workouts.length ? `${workouts.length} sessions saved.` : 'No sessions saved yet.'}
        className="mt-4"
        action={<SourceBadge source={workouts.length ? 'local' : 'empty'} />}
      >
        {workouts.length ? (
          <ul className="divide-y divide-charcoal/5">
            {workouts.slice(0, 8).map((workout) => (
              <li key={workout.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-charcoal">{workout.title}</p>
                  <p className="mt-0.5 text-[10px] text-charcoal/40">
                    {formatMinutes(workout.durationSeconds)} min · {workout.exercisesCompleted}/
                    {workout.totalExercises} exercises
                  </p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.08em] text-charcoal/30">
                  {relativeTime(workout.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-ivory/40 px-5 py-9 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-charcoal">Start your first session.</p>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-charcoal/45">
              Complete a planned workout or run an AI form check. Your history will build here.
            </p>
            <button
              type="button"
              onClick={() => openWorkout(nextPlanned)}
              className={buttonClasses('dark', 'sm', 'mt-4')}
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Start {nextPlanned.title}
            </button>
          </div>
        )}
      </SectionCard>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3 w-3" /> Sessions are timed in the player and saved on this device.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flame className="h-3 w-3" /> Profile training days: {profile?.workoutDays.length ?? 0}
        </span>
      </div>

      <WorkoutPlayer
        workout={activeWorkout}
        open={Boolean(activeWorkout)}
        onClose={() => setActiveWorkout(null)}
        onSave={handleSave}
      />
    </div>
  )
}
