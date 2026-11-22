import type { CompletedWorkout, WorkoutSession } from '../../../types'
import { templateForCategory } from '../data/planCatalog'
import type { GeneratedDay, RecommendationDocument } from '../types'
import { startOfWeek, workoutsForWeek } from '../../../utils/activity'

const PLAN_IMAGE: Record<string, { src: string; alt: string }> = {
  'full-body-strength': { src: '/images/strength.jpg', alt: 'Athlete training full-body strength' },
  'upper-lower': { src: '/images/gym-session.jpg', alt: 'Upper and lower body strength session' },
  'push-pull-legs': { src: '/images/gallery6.jpg', alt: 'Athlete pressing a barbell' },
  'bodyweight-circuit': { src: '/images/training.jpg', alt: 'Bodyweight training session' },
  'hiit-conditioning': { src: '/images/kettlebell.jpg', alt: 'High-intensity kettlebell conditioning' },
  'mobility-flow': { src: '/images/recovery.jpg', alt: 'Mobility and recovery work' },
  'endurance-run': { src: '/images/endurance.jpg', alt: 'Endurance running session' },
  sculpt: { src: '/images/woman-strong.jpg', alt: 'High-repetition sculpting session' },
  'power-strength': { src: '/images/gallery1.jpg', alt: 'Explosive power training' },
}

export function imageForPlan(plan: RecommendationDocument) {
  const template = templateForCategory(plan.predictedPlanCategory)
  return PLAN_IMAGE[template.id] ?? PLAN_IMAGE['full-body-strength']
}

export function trainingDays(plan: RecommendationDocument) {
  return plan.schedule.filter((day) => day.kind !== 'rest')
}

export function aiWorkoutId(plan: RecommendationDocument, day: GeneratedDay) {
  return `ai:${plan.recommendationId}:${day.weekday}`
}

export function toWorkoutSession(
  plan: RecommendationDocument,
  day: GeneratedDay,
  today = new Date(),
): WorkoutSession {
  return {
    id: aiWorkoutId(plan, day),
    day: day.weekday === today.getDay() ? 'Today' : day.dayName,
    dateLabel: day.focus,
    title: day.workoutTitle,
    focus: day.focus,
    duration: day.estimatedDuration,
    intensity: plan.safety.restricted ? 'Low' : plan.planTemplateId === 'mobility-flow' ? 'Low' : plan.planTemplateId === 'hiit-conditioning' || plan.planTemplateId === 'power-strength' ? 'High' : 'Moderate',
    status: day.weekday === today.getDay() ? 'today' : 'upcoming',
    weekday: day.weekday,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.exerciseName,
      sets: String(exercise.sets),
      reps: exercise.repetitions,
      rest: exercise.restSeconds >= 60 ? `${Math.round(exercise.restSeconds / 60)} min` : `${exercise.restSeconds} sec`,
      focus: exercise.primaryMuscle,
    })),
  }
}

/** Weekdays on which this AI plan was completed in the current week. */
export function completedAiWeekdays(plan: RecommendationDocument, workouts: CompletedWorkout[]) {
  const prefix = `ai:${plan.recommendationId}:`
  const completed = new Set<number>()
  for (const workout of workoutsForWeek(workouts, startOfWeek())) {
    if (!workout.workoutId.startsWith(prefix)) continue
    const weekday = Number.parseInt(workout.workoutId.slice(prefix.length), 10)
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) completed.add(weekday)
  }
  return completed
}

export function nextAiDay(
  plan: RecommendationDocument,
  completed: Set<number>,
  today = new Date(),
): GeneratedDay | null {
  const days = trainingDays(plan)
  if (days.length === 0) return null
  const todayDay = days.find((day) => day.weekday === today.getDay() && !completed.has(day.weekday))
  if (todayDay) return todayDay

  const ordered = [...days].sort(
    (a, b) =>
      ((a.weekday - today.getDay() + 7) % 7) - ((b.weekday - today.getDay() + 7) % 7),
  )
  return ordered.find((day) => !completed.has(day.weekday)) ?? ordered[0]
}

export function planDurationWeeks(plan: RecommendationDocument): number | null {
  const timeline = plan.missionSnapshot.answers['goal-deep-dive']?.timeline
  switch (timeline) {
    case '8-weeks':
      return 8
    case '12-weeks':
      return 12
    case '6-months':
      return 26
    case '12-months':
      return 52
    default:
      return null
  }
}

export function planWeekNumber(plan: RecommendationDocument, now = new Date()) {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(plan.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)),
  )
  const week = days + 1
  const duration = planDurationWeeks(plan)
  return { week, duration, label: duration ? `Week ${Math.min(week, duration)} of ${duration}` : `Week ${week} · open-ended` }
}

export interface ProgramBlock {
  id: string
  name: string
  phase: string
  frequency: string
  focus: string
  description: string
  tag: string
  active: boolean
  outdated: boolean
}

export function buildProgramBlocks(plans: RecommendationDocument[]): ProgramBlock[] {
  return plans
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((plan) => {
      const template = templateForCategory(plan.predictedPlanCategory)
      const { label } = planWeekNumber(plan)
      const days = trainingDays(plan).length
      return {
        id: plan.recommendationId,
        name: plan.predictedPlanCategory,
        phase: `${label} · ${planDurationWeeks(plan) ? `${planDurationWeeks(plan)} wk block` : 'open-ended'}`,
        frequency: `${days} days / week`,
        focus: template.label,
        description: template.description,
        tag: plan.isActive ? (plan.isOutdated ? 'Needs refresh' : 'Current program') : `v${plan.version} · previous`,
        active: plan.isActive,
        outdated: plan.isOutdated,
      }
    })
}
