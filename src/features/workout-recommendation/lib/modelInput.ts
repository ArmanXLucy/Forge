import type {
  DatasetEquipment,
  DatasetExperience,
  DatasetGoal,
  InjurySite,
  MissionAnswerMap,
  MissionAnswers,
  ModelGender,
  ModelInput,
  RecommendationReadiness,
} from '../types'
import { MISSIONS } from '../../../data/missions'
import type { FitnessGoal, MissionProgress, QuickStartProfile } from '../../../types'

const REQUIRED_MISSIONS = MISSIONS.map((mission) => mission.id)

const REQUIRED_FIELDS: Record<string, string[]> = {
  'body-metrics': ['weight'],
  'health-profile': ['conditions', 'clearance', 'emergencyConsent'],
  'training-history': ['experience', 'equipment'],
  'nutrition-profile': ['diet'],
  'lifestyle-check': ['sleepHours', 'dailyActivity', 'stress'],
  'goal-deep-dive': ['primaryGoal', 'timeline', 'motivation'],
  'mindset-mission': ['confidence', 'coachingStyle', 'habit', 'weeklyTime'],
}

const GOAL_MAP: Record<string, DatasetGoal> = {
  'fat-loss': 'Weight Loss',
  muscle: 'Muscle Gain',
  strength: 'Strength',
  endurance: 'Endurance',
  health: 'General Health',
  longevity: 'General Health',
}

const EXPERIENCE_MAP: Record<string, DatasetExperience> = {
  beginner: 'Beginner',
  returning: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const INJURY_KEYWORDS: Array<{ site: InjurySite; terms: string[] }> = [
  {
    site: 'Knee',
    terms: ['knee', 'patella', 'acl', 'mcl', 'meniscus', 'quadriceps tendon', 'jumper'],
  },
  {
    site: 'Ankle',
    terms: ['ankle', 'achilles', 'calf strain', 'foot', 'plantar', 'shin splint'],
  },
  {
    site: 'Shoulder',
    terms: ['shoulder', 'rotator cuff', 'clavicle', 'labrum', 'impingement', 'deltoid'],
  },
  {
    site: 'Back',
    terms: ['back', 'lumbar', 'spine', 'disc', 'sciatica', 'si joint', 'hernia'],
  },
]

const SAFETY_CONDITIONS = new Set(['cardiac', 'hypertension', 'diabetes', 'asthma', 'joint', 'other'])

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function getStringArray(answers: MissionAnswers | undefined, key: string): string[] {
  const value = answers?.[key]
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

export function hasAnswer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.trim().length > 0
}

/** Validates persisted mission answers, never the UI's completion badge. */
export function evaluateReadiness(
  profile: QuickStartProfile | null,
  answers: MissionAnswerMap,
  progress: Record<string, MissionProgress>,
): RecommendationReadiness {
  const completedMissionIds: string[] = []
  const remainingMissionIds: string[] = []
  const missingAnswerMissions: string[] = []
  const invalidFields: string[] = []
  const warnings: string[] = []

  if (!profile) {
    return {
      ready: false,
      completedMissions: 0,
      requiredMissions: REQUIRED_MISSIONS.length,
      completedMissionIds,
      remainingMissionIds: [...REQUIRED_MISSIONS],
      missingAnswerMissions: [],
      invalidFields: ['profile'],
      warnings: ['Complete the Quick Start profile before generating a plan.'],
    }
  }

  for (const missionId of REQUIRED_MISSIONS) {
    const status = progress[missionId]?.status
    if (status !== 'completed') {
      remainingMissionIds.push(missionId)
      continue
    }
    completedMissionIds.push(missionId)
    const missionAnswers = answers[missionId]
    if (!missionAnswers || Object.keys(missionAnswers).length === 0) {
      missingAnswerMissions.push(missionId)
      continue
    }
    for (const field of REQUIRED_FIELDS[missionId] ?? []) {
      if (!hasAnswer(missionAnswers[field])) {
        invalidFields.push(`${missionId}.${field}`)
      }
    }
  }

  const body = answers['body-metrics']
  const weight = asNumber(body?.weight)
  if (body && (weight === null || weight < 30 || weight > 300)) {
    invalidFields.push('body-metrics.weight')
  }
  if (profile.age < 16 || profile.age > 90) invalidFields.push('profile.age')
  if (profile.heightCm < 120 || profile.heightCm > 230) invalidFields.push('profile.heightCm')

  const gender = asString(body?.gender)
  if (body && !gender) {
    warnings.push('Gender was not provided. The model receives a neutral category.')
  }

  const training = answers['training-history']
  if (training && getStringArray(training, 'equipment').length === 0) {
    invalidFields.push('training-history.equipment')
  }

  const health = answers['health-profile']
  if (health) {
    const conditions = getStringArray(health, 'conditions')
    if (conditions.some((condition) => SAFETY_CONDITIONS.has(condition))) {
      warnings.push('A health condition is recorded. The plan is conservative and professional clearance is advised.')
    }
    const clearance = asString(health.clearance)
    if (clearance === 'pending' || clearance === 'restricted') {
      warnings.push('Medical clearance is pending or restricted. High-intensity work is excluded.')
    }
    const injuryText = `${asString(health.injuries)} ${asString(health.restrictions)}`.toLowerCase()
    if (injuryText.trim() && deriveInjurySites(health).length === 0) {
      warnings.push('An injury or restriction is recorded that is not one of the model categories. The plan applies conservative exclusions.')
    }
  }

  const uniqueInvalid = [...new Set(invalidFields)]
  return {
    ready:
      completedMissionIds.length === REQUIRED_MISSIONS.length &&
      missingAnswerMissions.length === 0 &&
      uniqueInvalid.length === 0,
    completedMissions: completedMissionIds.length,
    requiredMissions: REQUIRED_MISSIONS.length,
    completedMissionIds,
    remainingMissionIds,
    missingAnswerMissions,
    invalidFields: uniqueInvalid,
    warnings,
  }
}

export function deriveInjurySites(health: MissionAnswers | undefined): InjurySite[] {
  if (!health) return []
  const text = `${asString(health.injuries)} ${asString(health.restrictions)}`.toLowerCase()
  if (!text.trim()) return []
  const sites: InjurySite[] = []
  for (const entry of INJURY_KEYWORDS) {
    if (entry.terms.some((term) => text.includes(term))) sites.push(entry.site)
  }
  return sites
}

function mapEquipment(training: MissionAnswers | undefined): DatasetEquipment {
  const equipment = getStringArray(training, 'equipment')
  const has = (value: string) => equipment.includes(value)
  if (has('gym') || has('studio')) return 'Gym Membership'
  if (has('home-basic') && has('bands')) return 'Full Home Gym'
  if (has('home-basic')) return 'Home Dumbbells'
  if (has('bands') || has('cardio')) return 'Bodyweight Only'
  return 'Bodyweight Only'
}

function mapGender(value: string): ModelGender {
  if (value === 'male') return 'Male'
  if (value === 'female') return 'Female'
  return 'Unspecified'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export interface ModelInputResult {
  input: ModelInput
  injurySites: InjurySite[]
  warnings: string[]
  professionalReviewRecommended: boolean
  conditions: string[]
  clearance: string
}

/** Builds the exact model contract. Medical free text never enters the model. */
export function buildModelInput(
  profile: QuickStartProfile,
  answers: MissionAnswerMap,
): ModelInputResult {
  const warnings: string[] = []
  const body = answers['body-metrics']
  const training = answers['training-history']
  const goal = answers['goal-deep-dive']
  const health = answers['health-profile']

  const rawWeight = asNumber(body?.weight) ?? profile.weightKg
  const weight = clamp(rawWeight, 40, 120)
  const height = clamp(profile.heightCm, 150, 205)
  const age = clamp(profile.age, 20, 66)
  if (weight !== rawWeight) warnings.push('Weight was clamped to the model training range (40–120 kg).')
  if (height !== profile.heightCm) warnings.push('Height was clamped to the model training range (150–205 cm).')
  if (age !== profile.age) warnings.push('Age was clamped to the model training range (20–66).')

  const experience = EXPERIENCE_MAP[asString(training?.experience)] ?? 'Beginner'
  const datasetGoal = GOAL_MAP[asString(goal?.primaryGoal)] ?? 'General Health'
  const injurySites = deriveInjurySites(health)
  const modelInjury: InjurySite = injurySites[0] ?? 'None'

  const conditions = getStringArray(health, 'conditions')
  const clearance = asString(health?.clearance)
  const professionalReviewRecommended =
    conditions.some((condition) => SAFETY_CONDITIONS.has(condition)) ||
    clearance === 'pending' ||
    clearance === 'restricted'

  return {
    input: {
      Age: Math.round(age),
      Gender: mapGender(asString(body?.gender)),
      Weight_kg: Math.round(weight),
      Height_cm: Math.round(height),
      Goal: datasetGoal,
      Equipment: mapEquipment(training),
      Experience: experience,
      Injury: modelInjury,
    },
    injurySites,
    warnings,
    professionalReviewRecommended,
    conditions,
    clearance,
  }
}

export function datasetGoalToFitnessGoal(goal: string): FitnessGoal {
  switch (goal) {
    case 'Weight Loss':
      return 'fat-loss'
    case 'Muscle Gain':
    case 'Tone Up':
    case 'Powerlifting':
    case 'CrossFit':
      return 'build-muscle'
    case 'Strength':
      return 'get-stronger'
    case 'Endurance':
    case 'Marathon Training':
    case 'Athletic Performance':
      return 'endurance'
    case 'Flexibility':
      return 'longevity'
    default:
      return 'general-health'
  }
}

export function equipmentTagsForModel(equipment: DatasetEquipment) {
  switch (equipment) {
    case 'Gym Membership':
      return ['gym', 'dumbbells', 'bodyweight', 'cardio', 'mat'] as const
    case 'Full Home Gym':
      return ['gym', 'dumbbells', 'bands', 'bodyweight', 'mat'] as const
    case 'Home Dumbbells':
      return ['dumbbells', 'bodyweight', 'mat'] as const
    case 'Yoga Mat':
      return ['mat', 'bodyweight', 'bands'] as const
    default:
      return ['bodyweight', 'mat'] as const
  }
}
