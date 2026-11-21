import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Lock, RefreshCw, Sparkles } from 'lucide-react'
import { buttonClasses } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/dashboard/ui'
import { MISSION_MAP } from '../../../data/missions'
import { GOAL_LABELS } from '../../../lib/constants'
import { cn, formatDate } from '../../../lib/utils'
import { useWorkoutRecommendation } from '../hooks/useWorkoutRecommendation'
import { PlanSchedule } from './PlanSchedule'

/**
 * Compact, always-visible entry point used on the dashboard and inside
 * My Workout Plans. It never fakes a prediction: the AI plan only appears
 * after a real ONNX generation run.
 */
export function RecommendationSpotlight({
  className,
  showSchedule = false,
}: {
  className?: string
  showSchedule?: boolean
}) {
  const { readiness, active, outdated, generating, generate, hydrated } = useWorkoutRecommendation()
  const percent = Math.round(
    (readiness.completedMissions / Math.max(1, readiness.requiredMissions)) * 100,
  )
  const nextId = readiness.remainingMissionIds[0]
  const nextMission = nextId ? MISSION_MAP[nextId] : null

  if (!hydrated) {
    return (
      <section
        className={cn(
          'h-32 animate-pulse rounded-2xl border border-charcoal/10 bg-white',
          className,
        )}
        aria-label="Loading AI workout plan"
      />
    )
  }

  if (active) {
    const trainingDays = active.schedule.filter((day) => day.kind !== 'rest').length
    return (
      <section
        className={cn(
          'overflow-hidden rounded-2xl border border-charcoal/10 bg-white',
          className,
        )}
        aria-labelledby="ai-plan-heading"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-orange-700">
                <Sparkles className="h-2.5 w-2.5" /> AI workout plan
              </span>
              <span className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
                v{active.version} · {formatDate(new Date(active.createdAt), { weekday: undefined, year: undefined })}
              </span>
              {outdated && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  Profile changed
                </span>
              )}
            </div>
            <h2
              id="ai-plan-heading"
              className="mt-2 max-w-xl font-display uppercase text-2xl leading-none text-charcoal sm:text-3xl"
            >
              {active.predictedPlanCategory}
            </h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-charcoal/45">
              {trainingDays} training days ·{' '}
              {active.schedule.reduce((sum, day) => sum + day.estimatedDuration, 0)} planned minutes ·{' '}
              {GOAL_LABELS[active.fitnessGoal].toLowerCase()}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {outdated && (
              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating}
                className={buttonClasses('outline', 'sm')}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', generating && 'animate-spin')} /> Regenerate
              </button>
            )}
            <Link to="/dashboard/workout-recommendation" className={buttonClasses('dark', 'sm')}>
              View AI plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {showSchedule && (
          <div className="border-t border-charcoal/5 bg-ivory/40 p-4 sm:p-5">
            <PlanSchedule schedule={active.schedule} />
          </div>
        )}
      </section>
    )
  }

  if (!readiness.ready) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6',
          className,
        )}
        aria-labelledby="ai-locked-heading"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-charcoal text-white">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                AI workout plan
              </p>
              <h2
                id="ai-locked-heading"
                className="mt-1 font-display uppercase text-xl leading-none text-charcoal"
              >
                Unlock your personalised week
              </h2>
              <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-charcoal/45">
                Complete your fitness missions to unlock a workout plan tailored to your goals,
                experience, available equipment and physical limitations.
              </p>
            </div>
          </div>
          <Link to="/dashboard/missions" className={buttonClasses('primary', 'sm', 'shrink-0')}>
            Complete my missions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-charcoal/55">
              {readiness.completedMissions} of {readiness.requiredMissions} missions completed
            </span>
            <span className="text-charcoal/35">{percent}%</span>
          </div>
          <ProgressBar value={percent} />
        </div>
        {nextMission && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ivory p-3">
            <p className="flex items-center gap-2 text-[11px] text-charcoal/60">
              <Check className="h-3.5 w-3.5 text-orange-500" /> Next: {nextMission.title}
            </p>
            <Link
              to={`/dashboard/missions/${nextMission.id}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-600"
            >
              Continue <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </section>
    )
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-600/20 bg-white p-5 sm:p-6',
        className,
      )}
      aria-labelledby="ai-ready-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              AI workout plan unlocked
            </p>
            <h2
              id="ai-ready-heading"
              className="mt-1 font-display uppercase text-xl leading-none text-charcoal"
            >
              All missions complete.
            </h2>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-charcoal/45">
              Generate your first validated seven-day schedule. The model runs locally and nothing is
              predicted until you choose to generate.
            </p>
          </div>
        </div>
        <Link to="/dashboard/workout-recommendation" className={buttonClasses('primary', 'sm', 'shrink-0')}>
          <Sparkles className="h-3.5 w-3.5" /> Generate plan
        </Link>
      </div>
    </section>
  )
}
