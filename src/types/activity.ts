export type WorkoutSource = 'plan' | 'ai'

export interface CompletedWorkout {
  id: string
  workoutId: string
  title: string
  focus: string
  completedAt: string
  durationSeconds: number
  exercisesCompleted: number
  totalExercises: number
  source: WorkoutSource
}

export interface MealEntry {
  id: string
  date: string
  time: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MeasurementRecord {
  id: string
  measuredAt: string
  weightKg: number
  bodyFat?: number
  waistCm?: number
  chestCm?: number
  restingHr?: number
}

export interface LifestyleEntry {
  id: string
  date: string
  sleepHours: number
  sleepQuality: number
  steps: number
  stress: number
  recoveryHabits: string[]
}

export interface AISessionScore {
  atSeconds: number
  pGood: number
  threshold: number
  verdict: 'good' | 'needs-work'
  rangeOfMotion: number
  tempoVariation: number
  torsoLean: number
  kneeAsymmetry: number
}

export interface AISessionRecord {
  id: string
  exercise: 'squat' | 'bicep_curl' | 'push_up'
  exerciseLabel: string
  completedAt: string
  durationSeconds: number
  reps: number
  scores: AISessionScore[]
  averageFormScore: number | null
  bestFormScore: number | null
  verdict: 'good' | 'needs-work' | 'insufficient-data'
  source: 'camera' | 'video'
}

export interface NotificationPreferences {
  workoutReminders: boolean
  missionNudges: boolean
  weeklyReview: boolean
}

export interface PrivacyPreferences {
  productUpdates: boolean
  localAnalytics: boolean
}

export interface UserPreferences {
  notifications: NotificationPreferences
  privacy: PrivacyPreferences
  reminderTime: string
  weightUnit: 'kg'
  distanceUnit: 'km'
}

export interface ActivityState {
  workouts: CompletedWorkout[]
  meals: MealEntry[]
  waterByDate: Record<string, number>
  measurements: MeasurementRecord[]
  lifestyle: LifestyleEntry[]
  habitsByDate: Record<string, string[]>
  aiSessions: AISessionRecord[]
  preferences: UserPreferences
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    workoutReminders: true,
    missionNudges: true,
    weeklyReview: false,
  },
  privacy: {
    productUpdates: false,
    localAnalytics: false,
  },
  reminderTime: '18:00',
  weightUnit: 'kg',
  distanceUnit: 'km',
}

export const EMPTY_ACTIVITY: ActivityState = {
  workouts: [],
  meals: [],
  waterByDate: {},
  measurements: [],
  lifestyle: [],
  habitsByDate: {},
  aiSessions: [],
  preferences: DEFAULT_PREFERENCES,
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function relativeDateLabel(isoDate: string) {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
