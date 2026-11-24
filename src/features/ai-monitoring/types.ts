// Phase 4 — typed, privacy-safe AI monitoring contract.
// Every field here is either an operational identifier, a model fact, or an
// aggregate count. No answers, landmarks, frames, media URLs or free text
// beyond a short sanitised error message may be added.

export type AIMonitoringFeature = 'workout-recommendation' | 'ai-coach'

export type AIMonitoringStatus = 'info' | 'ok' | 'error'

export type AIMonitoringEventType =
  | 'recommendation.requested'
  | 'recommendation.generated'
  | 'recommendation.failed'
  | 'recommendation.saved'
  | 'recommendation.save_failed'
  | 'model.load_started'
  | 'model.load_succeeded'
  | 'model.load_failed'
  | 'inference.started'
  | 'inference.succeeded'
  | 'inference.failed'
  | 'validation.passed'
  | 'validation.failed'
  | 'coach.session.started'
  | 'coach.session.completed'
  | 'coach.session.interrupted'
  | 'coach.session.failed'
  | 'coach.session.saved'

export type AIErrorCategory =
  | 'model_load'
  | 'schema_load'
  | 'feature_extraction'
  | 'inference'
  | 'validation'
  | 'persistence'
  | 'camera'
  | 'pose_detection'
  | 'unknown'

export type AIMonitoringSource = 'camera' | 'video'

export interface AIMonitoringEventInput {
  feature: AIMonitoringFeature
  eventType: AIMonitoringEventType
  status: AIMonitoringStatus
  sessionRef?: string
  modelId?: string
  modelVersion?: string
  exercise?: string
  category?: string
  confidence?: number
  durationMs?: number
  inferenceMsSum?: number
  inferenceCount?: number
  goodCount?: number
  badCount?: number
  reps?: number
  errorCount?: number
  errorCategory?: AIErrorCategory
  errorCode?: string
  message?: string
  source?: AIMonitoringSource
}

export interface AIMonitoringDocument extends AIMonitoringEventInput {
  schemaVersion: 1
  eventId: string
  userId: string
  appVersion: string
}

export const AI_EVENT_TYPES: AIMonitoringEventType[] = [
  'recommendation.requested',
  'recommendation.generated',
  'recommendation.failed',
  'recommendation.saved',
  'recommendation.save_failed',
  'model.load_started',
  'model.load_succeeded',
  'model.load_failed',
  'inference.started',
  'inference.succeeded',
  'inference.failed',
  'validation.passed',
  'validation.failed',
  'coach.session.started',
  'coach.session.completed',
  'coach.session.interrupted',
  'coach.session.failed',
  'coach.session.saved',
]

export const AI_ERROR_CATEGORIES: AIErrorCategory[] = [
  'model_load',
  'schema_load',
  'feature_extraction',
  'inference',
  'validation',
  'persistence',
  'camera',
  'pose_detection',
  'unknown',
]

export const AI_FEATURES: AIMonitoringFeature[] = ['workout-recommendation', 'ai-coach']

/** Events that describe a completed or abandoned AI Coach session. */
export const COACH_TERMINAL_EVENTS: AIMonitoringEventType[] = [
  'coach.session.completed',
  'coach.session.interrupted',
  'coach.session.failed',
]

/** Events used for operational failure analytics. */
export const AI_ERROR_EVENTS: AIMonitoringEventType[] = [
  'recommendation.failed',
  'recommendation.save_failed',
  'model.load_failed',
  'inference.failed',
  'validation.failed',
  'coach.session.failed',
]