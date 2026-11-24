import type { MissionAnswerMap, RecommendationDocument } from '../types'
import { evaluateReadiness, buildModelInput } from './modelInput'
import { generateWorkoutPlan } from './generator'
import { createMonitoringSessionRef, trackAIEvent } from '../../../services/monitoring/aiMonitoring'

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

function errorCategoryFor(code: RecommendationErrorCode) {
  switch (code) {
    case 'model-unavailable':
      return 'model_load' as const
    case 'schema-unavailable':
      return 'schema_load' as const
    case 'inference-failed':
      return 'inference' as const
    case 'persistence-failed':
      return 'persistence' as const
    default:
      return 'validation' as const
  }
}

export async function createRecommendation(options: GenerateOptions): Promise<RecommendationDocument> {
  const sessionRef = createMonitoringSessionRef('rec')
  const startedAt = performance.now()
  trackAIEvent({
    feature: 'workout-recommendation',
    eventType: 'recommendation.requested',
    status: 'info',
    modelId: 'workout_recommendation',
    sessionRef,
  })

  const fail = (code: RecommendationErrorCode, message: string) => {
    trackAIEvent({
      feature: 'workout-recommendation',
      eventType: 'recommendation.failed',
      status: 'error',
      modelId: 'workout_recommendation',
      sessionRef,
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: errorCategoryFor(code),
      errorCode: code,
      message,
    })
  }

  const readiness = evaluateReadiness(options.profile, options.answers, options.progress)
  if (!readiness.ready) {
    const message = 'Your personalised plan is locked until every required mission is complete and valid.'
    fail('not-ready', message)
    throw new RecommendationError(
      'not-ready',
      message,
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
    prediction = await inference.predictPlanCategory(model.input, { sessionRef })
  } catch (error) {
    const inference = await import('./inference')
    if (error instanceof inference.InferenceError) {
      fail(error.code, error.message)
      throw new RecommendationError(error.code, error.message, [String(error.detail ?? '')])
    }
    fail('inference-failed', 'The AI model could not produce a prediction.')
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
    trackAIEvent({
      feature: 'workout-recommendation',
      eventType: 'validation.passed',
      status: 'ok',
      modelId: 'workout_recommendation',
      modelVersion: prediction.modelVersion,
      sessionRef,
      category: prediction.label,
    })
    trackAIEvent({
      feature: 'workout-recommendation',
      eventType: 'recommendation.generated',
      status: 'ok',
      modelId: 'workout_recommendation',
      modelVersion: prediction.modelVersion,
      sessionRef,
      category: prediction.label,
      confidence: prediction.confidence,
      durationMs: Math.round(performance.now() - startedAt),
    })
    return plan
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The workout schedule failed safety validation.'
    trackAIEvent({
      feature: 'workout-recommendation',
      eventType: 'validation.failed',
      status: 'error',
      modelId: 'workout_recommendation',
      modelVersion: prediction.modelVersion,
      sessionRef,
      category: prediction.label,
      errorCategory: 'validation',
      errorCode: 'schedule-invalid',
      message,
    })
    fail('schedule-invalid', message)
    throw new RecommendationError('schedule-invalid', message)
  }
}
