import type { MissionAnswerMap, RecommendationDocument } from '../types'
import { evaluateReadiness, buildModelInput } from './modelInput'
import { generateWorkoutPlan } from './generator'

export type RecommendationErrorCode =
  | 'not-ready'
  | 'model-unavailable'
  | 'schema-unavailable'
  | 'invalid-input'
  | 'inference-failed'
  | 'schedule-invalid'
  | 'persistence-failed'

export class RecommendationError extends Error {
  code: RecommendationErrorCode
  details?: string[]
  constructor(code: RecommendationErrorCode, message: string, details?: string[]) {
    super(message)
    this.name = 'RecommendationError'
    this.code = code
    this.details = details
  }
}

const RELEVANT_ANSWER_FIELDS: Record<string, string[]> = {
  'body-metrics': ['weight', 'gender'],
  'health-profile': ['conditions', 'injuries', 'restrictions', 'clearance'],
  'training-history': ['experience', 'equipment'],
  'lifestyle-check': ['sleepHours', 'stress', 'dailyActivity'],
  'goal-deep-dive': ['primaryGoal', 'secondaryGoals', 'timeline'],
  'mindset-mission': ['weeklyTime', 'coachingStyle', 'confidence'],
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${key}:${stable((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function authoritativeAnswers(answers: MissionAnswerMap): MissionAnswerMap {
  const snapshot: MissionAnswerMap = {}
  for (const [missionId, fields] of Object.entries(RELEVANT_ANSWER_FIELDS)) {
    const source = answers[missionId]
    if (!source) continue
    snapshot[missionId] = Object.fromEntries(fields.map((field) => [field, source[field] ?? null]))
  }
  return snapshot
}

export function isPlanOutdated(plan: RecommendationDocument, answers: MissionAnswerMap): boolean {
  const previous = stable(plan.missionSnapshot.answers ?? {})
  const current = stable(authoritativeAnswers(answers))
  if (previous === current) return false
  // Older snapshots stored every mission field. Compare only the relevant subset.
  if (plan.missionSnapshot.answers) {
    const filteredPrevious = stable(authoritativeAnswers(plan.missionSnapshot.answers))
    return filteredPrevious !== current
  }
  return true
}

export interface GenerateOptions {
  userId: string
  profile: NonNullable<import('../../../types').QuickStartProfile>
  answers: MissionAnswerMap
  progress: Record<string, import('../../../types').MissionProgress>
  previousPlans: RecommendationDocument[]
}

export async function createRecommendation(options: GenerateOptions): Promise<RecommendationDocument> {
  const readiness = evaluateReadiness(options.profile, options.answers, options.progress)
  if (!readiness.ready) {
    throw new RecommendationError(
      'not-ready',
      'Your personalised plan is locked until every required mission is complete and valid.',
      [
        ...readiness.remainingMissionIds.map((id) => `Mission incomplete: ${id}`),
        ...readiness.missingAnswerMissions.map((id) => `Answers missing: ${id}`),
        ...readiness.invalidFields.map((field) => `Invalid field: ${field}`),
      ],
    )
  }

  const model = buildModelInput(options.profile, options.answers)
  let prediction
  try {
    // Load ONNX Runtime only when the user actually generates a plan.
    const inference = await import('./inference')
    prediction = await inference.predictPlanCategory(model.input)
  } catch (error) {
    const inference = await import('./inference')
    if (error instanceof inference.InferenceError) {
      throw new RecommendationError(error.code, error.message, [String(error.detail ?? '')])
    }
    throw new RecommendationError('inference-failed', 'The AI model could not produce a prediction.')
  }

  try {
    const plan = generateWorkoutPlan({
      userId: options.userId,
      profile: options.profile,
      answers: options.answers,
      predictedCategory: prediction.label,
      classProbabilities: prediction.probabilities,
      confidence: prediction.confidence,
      modelVersion: prediction.modelVersion,
      inferenceMs: prediction.inferenceMs,
      previousPlans: options.previousPlans,
      seed: Date.now() % 100000,
    })
    plan.missionSnapshot.answers = authoritativeAnswers(options.answers)
    return plan
  } catch (error) {
    throw new RecommendationError(
      'schedule-invalid',
      error instanceof Error ? error.message : 'The workout schedule failed safety validation.',
    )
  }
}
