import type {
  AIErrorCategory,
  AIMonitoringEventType,
  AIMonitoringFeature,
  AIMonitoringStatus,
} from './types'

/**
 * Read model for the top-level ai_monitoring_events collection. Parsing is
 * defensive: a malformed or partially migrated document must never take down
 * an admin page.
 */
export interface AIMonitoringEventRecord {
  id: string
  userId: string
  feature: AIMonitoringFeature
  eventType: AIMonitoringEventType
  status: AIMonitoringStatus
  createdAt: string
  appVersion: string
  schemaVersion: number
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
  source?: 'camera' | 'video'
}

export interface AdminAISessionSummary {
  id: string
  userId: string
  exercise: string
  exerciseLabel: string
  completedAt: string
  durationSeconds: number
  reps: number
  averageFormScore: number | null
  bestFormScore: number | null
  verdict: 'good' | 'needs-work' | 'insufficient-data'
  source: 'camera' | 'video'
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function toIso(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const date = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}
