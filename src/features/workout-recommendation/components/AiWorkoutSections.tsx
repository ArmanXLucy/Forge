import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  MoonStar,
  Play,
  Repeat2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { buttonClasses } from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'
import { WEEKDAYS } from '../../../lib/constants'
import type { GeneratedDay, RecommendationDocument } from '../types'
import {
  buildProgramBlocks,
  imageForPlan,
  planDurationWeeks,
  planWeekNumber,
  toWorkoutSession,
  trainingDays,
  type ProgramBlock,
} from '../lib/planView'

export function AiPlanHero({
  plan,
  nextDay,
  completed,
  onStart,
}: {
  plan: RecommendationDocument
  nextDay: GeneratedDay | null
  completed: Set<number>
  onStart: (day: GeneratedDay) => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const image = imageForPlan(plan)
  const days = trainingDays(plan)
  const weeklyMinutes = days.reduce((sum, day) => sum + day.estimatedDuration, 0)
  const duration = planDurationWeeks(plan)
  const week = planWeekNumber(plan)

  return (
    <section className="mt-4 overflow-hidden rounded-2xl bg-charcoal text-white">
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        <div className="relative order-1 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
              <Sparkles className="h-2.5 w-2.5" /> AI workout plan
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/55">
              v{plan.version}
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/55">
              {duration ? `${duration}-week block` : 'Open-ended block'}
            </span>
            {plan.isOutdated && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-amber-300">
                Profile changed
              </span>
            )}
            <span className="ml-auto text-[9px] uppercase tracking-[0.1em] text-white/30">
              {week.label}
            </span>
          </div>

          <h2 className="mt-4 max-w-xl font-display uppercase text-3xl leading-none sm:text-4xl">
            {plan.predictedPlanCategory}
          </h2>
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-white/50">
            {plan.planTitle} · {days.length} training days · {weeklyMinutes} planned minutes each week.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {plan.schedule.map((day) => (
              <span
                key={day.weekday}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em]',
                  day.kind === 'rest'
                    ? 'border-white/10 text-white/30'
                    : completed.has(day.weekday)
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/20 bg-white/5 text-white/70',
                )}
              >
                {day.dayName.slice(0, 3)}
                {day.kind === 'rest' ? <MoonStar className="h-2.5 w-2.5" /> : completed.has(day.weekday) ? <Check className="h-2.5 w-2.5" /> : <Dumbbell className="h-2.5 w-2.5" />}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">Training days</p>
              <p className="mt-1 font-display uppercase text-xl">{days.length}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">Weekly time</p>
              <p className="mt-1 font-display uppercase text-xl">{weeklyMinutes} min</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">Split</p>
              <p className="mt-1 truncate font-display uppercase text-xl">
                {plan.planTemplateId.replace(/-/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.14em] text-white/30">Next session</p>
              <p className="mt-1 truncate font-display uppercase text-xl">
                {nextDay ? nextDay.dayName.slice(0, 3) : 'Done'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => nextDay && onStart(nextDay)}
              disabled={!nextDay}
              className={buttonClasses('primary', 'sm')}
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Start workout
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              disabled={!nextDay}
              className={buttonClasses('outline-light', 'sm')}
            >
              {previewOpen ? 'Hide exercises' : 'Preview exercises'}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', previewOpen && 'rotate-180')} />
            </button>
            <Link to="/dashboard/workout-recommendation" className={buttonClasses('outline-light', 'sm')}>
              View full plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="relative order-2 h-44 overflow-hidden sm:h-56 lg:h-auto lg:min-h-[360px]">
          <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/45 to-charcoal/10 lg:bg-gradient-to-r lg:from-charcoal lg:via-charcoal/45 lg:to-transparent" />
          <div className="absolute bottom-4 right-4 rounded-xl border border-white/15 bg-charcoal/55 px-3 py-2 backdrop-blur-sm">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/45">Generated by</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-3 w-3 text-orange-400" /> On-device AI · {(plan.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {previewOpen && nextDay && (
        <div className="border-t border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
              {nextDay.workoutTitle}
            </p>
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
              {nextDay.dayName} · {nextDay.estimatedDuration} min
            </span>
          </div>
          <ul className="mt-3 divide-y divide-white/10">
            {nextDay.exercises.map((exercise, index) => (
              <li key={`${exercise.exerciseId}-${index}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="w-5 text-[10px] font-bold text-white/25">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-[140px] flex-1 text-[13px] font-semibold text-white">
                  {exercise.exerciseName}
                </span>
                <span className="text-[11px] text-white/45">{exercise.primaryMuscle}</span>
                <span className="ml-auto text-[11px] font-semibold text-orange-400">
                  {exercise.sets} × {exercise.repetitions}
                </span>
                <span className="w-16 text-right text-[10px] text-white/30">
                  {exercise.restSeconds >= 60
                    ? `${Math.round(exercise.restSeconds / 60)} min`
                    : `${exercise.restSeconds}s`}
                </span>
              </li>
            ))}
          </ul>
          {nextDay.recoveryNotes && (
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-white/35">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> {nextDay.recoveryNotes}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function AiWeekGlance({
  plan,
  completed,
}: {
  plan: RecommendationDocument
  completed: Set<number>
}) {
  const today = new Date().getDay()
  return (
    <section className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
            Week at a glance
          </p>
          <p className="mt-1 text-[11px] text-charcoal/40">
            Your generated training and recovery days, with completed sessions marked.
          </p>
        </div>
        <Badge tone="orange">
          <Sparkles className="h-3 w-3" /> AI schedule
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {plan.schedule.map((day) => {
          const isToday = day.weekday === today
          const isRest = day.kind === 'rest'
          const isCompleted = completed.has(day.weekday)
          return (
            <div
              key={day.weekday}
              className={cn(
                'flex min-h-[96px] flex-col items-center justify-between rounded-xl border p-2 text-center sm:min-h-[108px] sm:p-2.5',
                isToday
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : isRest
                    ? 'border-charcoal/5 bg-charcoal/[0.02]'
                    : 'border-charcoal/10 bg-ivory',
              )}
            >
              <span className={cn('text-[9px] font-bold uppercase tracking-[0.08em]', isToday ? 'text-white/75' : 'text-charcoal/35')}>
                {WEEKDAYS.find((entry) => entry.value === day.weekday)?.short ?? day.dayName.slice(0, 3)}
              </span>
              {isRest ? (
                <span
                  className={cn(
                    'my-2 inline-flex flex-col items-center gap-1 text-[8px] uppercase tracking-[0.08em]',
                    isToday ? 'text-white/75' : 'text-charcoal/25',
                  )}
                >
                  <MoonStar className="h-3.5 w-3.5" /> Rest
                </span>
              ) : (
                <>
                  <span className={cn('my-1 flex h-8 w-8 items-center justify-center rounded-full', isToday ? 'bg-white/15' : 'bg-white')}>
                    {isCompleted ? (
                      <Check className={cn('h-3.5 w-3.5', isToday ? 'text-white' : 'text-emerald-600')} />
                    ) : (
                      <Dumbbell className={cn('h-3.5 w-3.5', isToday ? 'text-white' : 'text-orange-600')} />
                    )}
                  </span>
                  <span className={cn('hidden text-[8px] leading-tight sm:block', isToday ? 'text-white/75' : 'text-charcoal/45')}>
                    {day.workoutTitle.split('—')[0].trim()}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/30">
        Markers come from sessions completed in the current week. Starting a workout from this page
        records it against the matching AI plan day.
      </p>
    </section>
  )
}

export function AiUpcomingSessions({
  plan,
  completed,
  nextDay,
  onStart,
}: {
  plan: RecommendationDocument
  completed: Set<number>
  nextDay: GeneratedDay | null
  onStart: (day: GeneratedDay) => void
}) {
  const [expanded, setExpanded] = useState<number | null>(nextDay?.weekday ?? null)
  const today = new Date().getDay()
  const upcoming = trainingDays(plan).filter((day) => !completed.has(day.weekday))

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
            Upcoming sessions
          </p>
          <h2 className="mt-1.5 text-[14px] font-semibold text-charcoal">Your generated week.</h2>
        </div>
        <Badge tone="orange">
          <Sparkles className="h-3 w-3" /> AI generated
        </Badge>
      </div>
      <div className="space-y-2.5 p-5 sm:p-6">
        {upcoming.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-600/20 bg-emerald-50/50 px-4 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-charcoal">Every session this week is done.</p>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-charcoal/45">
              Recovery is part of the plan. You can repeat a session or start next week fresh.
            </p>
            {nextDay && (
              <button type="button" onClick={() => onStart(nextDay)} className={buttonClasses('outline', 'sm', 'mt-4')}>
                <Play className="h-3.5 w-3.5" /> Repeat next session
              </button>
            )}
          </div>
        )}
        {upcoming.map((day) => (
          <article key={day.weekday} className="overflow-hidden rounded-xl border border-charcoal/10">
            <button
              type="button"
              onClick={() => setExpanded(expanded === day.weekday ? null : day.weekday)}
              className="flex w-full items-center gap-3 p-3.5 text-left"
              aria-expanded={expanded === day.weekday}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  day.weekday === today ? 'bg-orange-500 text-white' : 'bg-ivory text-charcoal/60',
                )}
              >
                <Dumbbell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-charcoal">{day.workoutTitle}</span>
                  {day.weekday === today && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-orange-700">
                      Today
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[10px] text-charcoal/40">
                  {day.dayName} · {day.focus} · {day.estimatedDuration} min
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-charcoal/30 transition-transform',
                  expanded === day.weekday && 'rotate-180',
                )}
              />
            </button>
            {expanded === day.weekday && (
              <div className="border-t border-charcoal/5 bg-ivory/50 px-3.5 py-3">
                <ul className="space-y-2">
                  {day.exercises.map((exercise, index) => (
                    <li key={`${exercise.exerciseId}-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="font-medium text-charcoal/70">{exercise.exerciseName}</span>
                      <span className="shrink-0 text-charcoal/40">
                        {exercise.sets} × {exercise.repetitions}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onStart(day)}
                  className={buttonClasses('dark', 'sm', 'mt-3 w-full')}
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Start this session
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

export function AiProgramBlocks({
  blocks,
  planCount,
}: {
  blocks: ProgramBlock[]
  planCount: number
}) {
  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
            Programme blocks
          </p>
          <h2 className="mt-1.5 text-[14px] font-semibold text-charcoal">Your AI training blocks.</h2>
        </div>
        <Repeat2 className="h-4 w-4 text-charcoal/25" />
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {blocks.map((block) => (
          <article
            key={block.id}
            className={cn(
              'rounded-xl border p-4',
              block.active ? 'border-orange-500/25 bg-orange-500/[0.04]' : 'border-charcoal/10',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-charcoal">{block.name}</p>
              <Badge tone={block.outdated ? 'red' : block.active ? 'orange' : 'muted'}>{block.tag}</Badge>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-charcoal/35">
              {block.phase} · {block.frequency}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-charcoal/45">{block.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/30">
              <TrendingUp className="h-3 w-3" /> {block.focus}
            </p>
          </article>
        ))}
        {planCount === 1 && (
          <div className="rounded-xl bg-ivory p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/45">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" /> AI generated blocks
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">
              This block comes from your current AI plan. Regenerate the plan to create the next
              progression block; previous blocks are kept here.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export function AiWeekSummary({ plan }: { plan: RecommendationDocument }) {
  const days = plan.schedule
  return (
    <div className="flex flex-wrap items-center gap-2">
      {days.map((day) => (
        <span
          key={day.weekday}
          className={cn(
            'inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em]',
            day.kind === 'rest' ? 'text-charcoal/25' : 'text-charcoal/50',
          )}
        >
          <CalendarDays className="h-3 w-3" />
          {WEEKDAYS.find((entry) => entry.value === day.weekday)?.short}
          {day.kind === 'rest' ? ' rest' : ''}
        </span>
      ))}
    </div>
  )
}

export function AiSessionMeta({ day }: { day: GeneratedDay }) {
  return (
    <span className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.08em] text-charcoal/35">
      <Clock3 className="h-3 w-3" /> {day.estimatedDuration} min
      <Dumbbell className="h-3 w-3" /> {day.exercises.length} exercises
    </span>
  )
}

export { toWorkoutSession }
