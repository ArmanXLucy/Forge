import type {
  EquipmentTag,
  GeneratedDay,
  InjurySite,
  RecommendationDocument,
} from '../types'
import { EXERCISE_MAP } from '../data/exerciseLibrary'

export interface PlanValidationContext {
  injurySites: InjurySite[]
  allowedEquipment: readonly EquipmentTag[]
}

export const MIN_EXERCISES_PER_SESSION = 2
export const MAX_SESSION_MINUTES = 90
export const MAX_DAILY_SETS = 26
export const MAX_WEEKLY_SETS = 110

/** Structural + safety validation run before a plan is persisted. */
export function validatePlan(plan: RecommendationDocument, context: PlanValidationContext): string[] {
  const issues: string[] = []
  const { schedule } = plan

  if (schedule.length !== 7) {
    issues.push(`Schedule must contain exactly 7 days, received ${schedule.length}`)
  }
  const weekdays = new Set<number>()
  for (const day of schedule) {
    if (weekdays.has(day.weekday)) issues.push(`Duplicate weekday ${day.weekday}`)
    weekdays.add(day.weekday)
    if (day.weekday < 0 || day.weekday > 6) issues.push(`Invalid weekday ${day.weekday}`)
    if (!day.dayName) issues.push(`Day ${day.dayNumber} is missing a name`)
  }
  if (weekdays.size !== 7) issues.push('Schedule must cover all seven weekdays')

  const restDays = schedule.filter((day) => day.kind === 'rest')
  if (restDays.length < 1) issues.push('At least one rest day is required')

  let weeklySets = 0
  for (const day of schedule) {
    if (day.kind === 'rest') {
      if (day.exercises.length > 0) issues.push(`${day.dayName} is a rest day but contains exercises`)
      continue
    }
    if (day.exercises.length < MIN_EXERCISES_PER_SESSION) {
      issues.push(`${day.dayName} has only ${day.exercises.length} exercises`)
    }
    if (day.estimatedDuration > MAX_SESSION_MINUTES) {
      issues.push(`${day.dayName} exceeds ${MAX_SESSION_MINUTES} minutes`)
    }
    if (day.estimatedDuration <= 0) issues.push(`${day.dayName} has no estimated duration`)

    const dailySets = day.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)
    weeklySets += dailySets
    if (dailySets > MAX_DAILY_SETS) issues.push(`${day.dayName} has ${dailySets} working sets`)

    const names = new Set<string>()
    for (const exercise of day.exercises) {
      if (names.has(exercise.exerciseId)) {
        issues.push(`${day.dayName} repeats ${exercise.exerciseName}`)
      }
      names.add(exercise.exerciseId)
      if (exercise.sets < 1 || exercise.sets > 6) {
        issues.push(`${exercise.exerciseName} has invalid set count ${exercise.sets}`)
      }
      if (!exercise.repetitions) issues.push(`${exercise.exerciseName} is missing repetitions/duration`)

      const definition = EXERCISE_MAP[exercise.exerciseId]
      if (!definition) {
        issues.push(`${day.dayName} uses unknown exercise ${exercise.exerciseId}`)
        continue
      }
      if (definition.injuryExclusions.some((site) => context.injurySites.includes(site))) {
        issues.push(`${exercise.exerciseName} conflicts with a recorded ${context.injurySites.join('/')} limitation`)
      }
      if (!definition.equipment.some((tag) => context.allowedEquipment.includes(tag))) {
        issues.push(`${exercise.exerciseName} requires unavailable equipment`)
      }
    }
  }

  if (weeklySets > MAX_WEEKLY_SETS) issues.push(`Weekly volume ${weeklySets} exceeds ${MAX_WEEKLY_SETS} sets`)
  return issues
}

export function planHasRestDay(schedule: GeneratedDay[]) {
  return schedule.some((day) => day.kind === 'rest')
}
