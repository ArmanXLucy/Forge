import type {
  AISessionRecord,
  CompletedWorkout,
  LifestyleEntry,
  MealEntry,
  MeasurementRecord,
  MissionProgress,
} from '../types'

export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeek(date = new Date()) {
  const result = startOfDay(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  if (minutes === 0) return `${remainder}s`
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`
}

export function formatMinutes(seconds: number) {
  return Math.max(0, Math.round(seconds / 60))
}

export function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function sumMeals(meals: MealEntry[]) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fat: totals.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function workoutsForWeek(workouts: CompletedWorkout[], weekStart = startOfWeek()) {
  const start = startOfDay(weekStart).getTime()
  const end = addDays(weekStart, 7).getTime()
  return workouts.filter((workout) => {
    const time = new Date(workout.completedAt).getTime()
    return time >= start && time < end
  })
}

export function workoutDayKeys(workouts: CompletedWorkout[]) {
  return new Set(workouts.map((workout) => dateKey(new Date(workout.completedAt))))
}

export function weeklySeries(workouts: CompletedWorkout[], days = 7) {
  const today = startOfDay(new Date())
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1))
    const key = dateKey(date)
    const minutes = workouts
      .filter((workout) => dateKey(new Date(workout.completedAt)) === key)
      .reduce((sum, workout) => sum + workout.durationSeconds / 60, 0)
    return {
      date,
      key,
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      minutes: Math.round(minutes),
    }
  })
}

export function monthlySeries(workouts: CompletedWorkout[], weeks = 4) {
  const start = startOfWeek(addDays(new Date(), -7 * (weeks - 1)))
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(start, index * 7)
    const end = addDays(weekStart, 7)
    const minutes = workouts
      .filter((workout) => {
        const time = new Date(workout.completedAt).getTime()
        return time >= weekStart.getTime() && time < end.getTime()
      })
      .reduce((sum, workout) => sum + workout.durationSeconds / 60, 0)
    const sessions = workouts.filter((workout) => {
      const time = new Date(workout.completedAt).getTime()
      return time >= weekStart.getTime() && time < end.getTime()
    }).length
    return {
      label: `W${index + 1}`,
      range: `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      minutes: Math.round(minutes),
      sessions,
    }
  })
}

export function computeStreak(
  workouts: CompletedWorkout[],
  aiSessions: AISessionRecord[],
  progress: Record<string, MissionProgress>,
) {
  const activeDays = workoutDayKeys(workouts)
  aiSessions.forEach((session) => activeDays.add(dateKey(new Date(session.completedAt))))
  Object.values(progress).forEach((mission) => {
    if (mission.status === 'completed' && mission.completedAt) {
      activeDays.add(dateKey(new Date(mission.completedAt)))
    }
  })

  let streak = 0
  let cursor = startOfDay(new Date())
  if (!activeDays.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1)
    if (!activeDays.has(dateKey(cursor))) return 0
  }
  while (activeDays.has(dateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function latestMeasurement(measurements: MeasurementRecord[]) {
  return [...measurements].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] ?? null
}

export function measurementChange(measurements: MeasurementRecord[], key: 'weightKg' | 'bodyFat' | 'waistCm') {
  const sorted = [...measurements]
    .filter((entry) => typeof entry[key] === 'number')
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  if (sorted.length < 2) return null
  const first = sorted[0][key] as number
  const last = sorted[sorted.length - 1][key] as number
  return Math.round((last - first) * 10) / 10
}

export function lifestyleForDate(lifestyle: LifestyleEntry[], date: string) {
  return lifestyle.find((entry) => entry.date === date) ?? null
}

export function sleepSeries(lifestyle: LifestyleEntry[], days = 7) {
  const today = startOfDay(new Date())
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1))
    const key = dateKey(date)
    const entry = lifestyle.find((item) => item.date === key)
    return {
      key,
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      hours: entry?.sleepHours ?? 0,
      quality: entry?.sleepQuality ?? 0,
      logged: Boolean(entry),
    }
  })
}

export function relativeTime(iso: string) {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
