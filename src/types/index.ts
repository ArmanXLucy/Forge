export * from './admin'
export * from './support'
export * from './activity'
export * from './cloud'

export type FitnessGoal =
  | 'fat-loss'
  | 'build-muscle'
  | 'get-stronger'
  | 'endurance'
  | 'general-health'
  | 'longevity'

export type ExperienceLevel = 'beginner' | 'returning' | 'intermediate' | 'advanced'

export interface QuickStartProfile {
  name: string
  age: number
  heightCm: number
  weightKg: number
  goal: FitnessGoal
  experience: ExperienceLevel
  workoutDays: number[]
  completedAt: string
}

export type MissionStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type MissionFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'scale'
  | 'toggle'

export interface MissionFieldOption {
  value: string
  label: string
}

export interface MissionField {
  id: string
  label: string
  type: MissionFieldType
  placeholder?: string
  help?: string
  unit?: string
  required?: boolean
  min?: number
  max?: number
  options?: MissionFieldOption[]
}

export interface MissionSection {
  title: string
  description?: string
  fields: MissionField[]
}

export interface MissionDefinition {
  id: string
  number: string
  title: string
  shortTitle: string
  description: string
  estimatedMinutes: number
  xp: number
  /** True when the form contains health, medical or image data. Current builds persist submitted answers, so privacy copy must describe that storage. */
  sensitive: boolean
  safetyCritical?: boolean
  sections: MissionSection[]
}

export interface MissionProgress {
  missionId: string
  status: MissionStatus
  startedAt?: string
  completedAt?: string
  answeredFields?: number
  totalFields?: number
}

export interface AdvancedAssessment {
  id: string
  title: string
  description: string
  minutes: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  xp: number
  icon: 'footprints' | 'ruler' | 'dumbbell' | 'apple' | 'flame' | 'trophy' | 'brain' | 'shield'
}

export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  isDemo: boolean
}

export interface WorkoutExercise {
  name: string
  sets: string
  reps: string
  rest: string
  focus: string
}

export interface WorkoutSession {
  id: string
  day: string
  dateLabel: string
  title: string
  focus: string
  duration: number
  intensity: 'Low' | 'Moderate' | 'High'
  status: 'completed' | 'today' | 'upcoming'
  weekday: number
  exercises: WorkoutExercise[]
}

export interface ActivityPoint {
  day: string
  minutes: number
  calories: number
}

export interface MeasurementEntry {
  label: string
  value: number
  unit: string
  change: number
  measuredAt: string
}

export interface WeightPoint {
  week: string
  weight: number
  bodyFat: number
}

export interface PlanMeal {
  id: string
  time: string
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Testimonial {
  quote: string
  name: string
  detail: string
  initials: string
}

export interface ServiceProgram {
  id: string
  number: string
  title: string
  tagline: string
  description: string
  image: string
  includes: string[]
}

export interface PricingPlan {
  id: string
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  highlighted?: boolean
  badge?: string
}

export interface Credential {
  id: string
  year: string
  title: string
  institution: string
  description: string
}

export interface FaqItem {
  question: string
  answer: string
}
