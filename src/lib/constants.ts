import type { ExperienceLevel, FitnessGoal } from '../types'

export const BRAND = {
  name: 'Forge Athletic',
  shortName: 'FORGE',
  tagline: 'Personal Coaching Studio',
  city: 'Lausanne, Switzerland',
  email: 'hello@forge-athletic.ch',
  phone: '+41 21 555 04 82',
  address: 'Rue du Midi 18, 1003 Lausanne',
  hours: 'Mon–Fri 06:00–21:00 · Sat 08:00–14:00',
}

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  'fat-loss': 'Fat loss',
  'build-muscle': 'Build muscle',
  'get-stronger': 'Get stronger',
  endurance: 'Endurance',
  'general-health': 'General health',
  longevity: 'Longevity',
}

export const GOAL_OPTIONS = Object.entries(GOAL_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'New to training',
  returning: 'Returning after a break',
  intermediate: 'Training consistently',
  advanced: 'Advanced / athlete',
}

export const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export const EXPERIENCE_NOTES: Record<ExperienceLevel, string> = {
  beginner: 'Under 1 year of structured training',
  returning: 'Coming back after 3+ months off',
  intermediate: '1–3 years, 3+ sessions a week',
  advanced: '3+ years, structured programming',
}

export const WEEKDAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
]

export const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#programs' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'About', href: '/#about' },
  { label: 'Start', href: '/#contact' },
]
