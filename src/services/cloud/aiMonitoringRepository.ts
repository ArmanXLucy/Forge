import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { firestore } from '../../lib/firestore'
import type { AIMonitoringFeature } from '../../features/ai-monitoring/types'
import {
  asNumber,
  asString,
  toIso,
  type AdminAISessionSummary,
  type AIMonitoringEventRecord,
} from '../../features/ai-monitoring/records'

const EVENTS = 'ai_monitoring_events'
export const EVENT_SCAN_CAP = 1000
export const SESSION_SCAN_CAP = 500
export const ERROR_SCAN_CAP = 500

function db() {
  if (!firestore) throw new Error('Cloud sync is not configured for this build.')
  return firestore
}

export interface MonitoringEventPage {
  events: AIMonitoringEventRecord[]
  truncated: boolean
  cappedAt: number
  windowStart: string
}

export interface MonitoringWindowInput {
  feature: AIMonitoringFeature
  since: Date
  max?: number
}

function parseEvent(id: string, data: DocumentData): AIMonitoringEventRecord | null {
  const feature = data.feature
  const eventType = data.eventType
  const status = data.status
  const createdAt = toIso(data.createdAt)
  if (feature !== 'workout-recommendation' && feature !== 'ai-coach') return null
  if (typeof eventType !== 'string' || typeof status !== 'string' || !createdAt) return null
  return {
    id,
    userId: asString(data.userId) ?? '',
    feature,
    eventType: eventType as AIMonitoringEventRecord['eventType'],
    status: status as AIMonitoringEventRecord['status'],
    createdAt,
    appVersion: asString(data.appVersion) ?? 'unknown',
    schemaVersion: asNumber(data.schemaVersion) ?? 0,
    sessionRef: asString(data.sessionRef),
    modelId: asString(data.modelId),
    modelVersion: asString(data.modelVersion),
    exercise: asString(data.exercise),
    category: asString(data.category),
    confidence: asNumber(data.confidence),
    durationMs: asNumber(data.durationMs),
    inferenceMsSum: asNumber(data.inferenceMsSum),
    inferenceCount: asNumber(data.inferenceCount),
    goodCount: asNumber(data.goodCount),
    badCount: asNumber(data.badCount),
    reps: asNumber(data.reps),
    errorCount: asNumber(data.errorCount),
    errorCategory: asString(data.errorCategory) as AIMonitoringEventRecord['errorCategory'],
    errorCode: asString(data.errorCode),
    message: asString(data.message),
    source: data.source === 'video' ? 'video' : data.source === 'camera' ? 'camera' : undefined,
  }
}

/**
 * Bounded, date-filtered read. One extra document is requested so the caller
 * can tell "no more data" apart from "the cap was hit".
 */
export async function listMonitoringEvents({
  feature,
  since,
  max = EVENT_SCAN_CAP,
}: MonitoringWindowInput): Promise<MonitoringEventPage> {
  const snapshot = await getDocs(
    query(
      collection(db(), EVENTS),
      where('feature', '==', feature),
      where('createdAt', '>=', Timestamp.fromDate(since)),
      orderBy('createdAt', 'desc'),
      limit(max + 1),
    ),
  )
  const events = snapshot.docs
    .map((item) => parseEvent(item.id, item.data()))
    .filter((event): event is AIMonitoringEventRecord => event !== null)
    .slice(0, max)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return {
    events,
    truncated: snapshot.docs.length > max,
    cappedAt: max,
    windowStart: since.toISOString(),
  }
}

export interface ErrorLogPage {
  events: AIMonitoringEventRecord[]
  truncated: boolean
  cappedAt: number
  windowStart: string
}

export async function listMonitoringErrors({
  since,
  feature,
  max = ERROR_SCAN_CAP,
}: {
  since: Date
  feature?: AIMonitoringFeature
  max?: number
}): Promise<ErrorLogPage> {
  const conditions = [
    where('status', '==', 'error'),
    where('createdAt', '>=', Timestamp.fromDate(since)),
    ...(feature ? [where('feature', '==', feature)] : []),
  ]
  const snapshot = await getDocs(
    query(
      collection(db(), EVENTS),
      ...conditions,
      orderBy('createdAt', 'desc'),
      limit(max + 1),
    ),
  )
  const events = snapshot.docs
    .map((item) => parseEvent(item.id, item.data()))
    .filter((event): event is AIMonitoringEventRecord => event !== null)
    .slice(0, max)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return {
    events,
    truncated: snapshot.docs.length > max,
    cappedAt: max,
    windowStart: since.toISOString(),
  }
}

export interface AdminSessionPage {
  sessions: AdminAISessionSummary[]
  truncated: boolean
  cappedAt: number
}

/**
 * Saved AI Coach outcomes. completedAt is stored as an ISO string, so the
 * window filter is applied after a bounded, newest-first read rather than
 * comparing it to a Firestore Timestamp (which would never match).
 */
export async function listAdminAISessions({
  since,
  max = SESSION_SCAN_CAP,
}: {
  since?: Date
  max?: number
}): Promise<AdminSessionPage> {
  const snapshot = await getDocs(
    query(
      collectionGroup(db(), 'ai_sessions'),
      orderBy('completedAt', 'desc'),
      limit(max + 1),
    ),
  )
  const sessions: AdminAISessionSummary[] = []
  for (const item of snapshot.docs) {
    const data = item.data()
    const completedAt = toIso(data.completedAt)
    if (!completedAt) continue
    if (since && new Date(completedAt).getTime() < since.getTime()) continue
    const parent = item.ref.parent.parent
    sessions.push({
      id: item.id,
      userId: parent?.id ?? asString(data.userId) ?? '',
      exercise: asString(data.exercise) ?? 'unknown',
      exerciseLabel: asString(data.exerciseLabel) ?? 'Exercise',
      completedAt,
      durationSeconds: asNumber(data.durationSeconds) ?? 0,
      reps: asNumber(data.reps) ?? 0,
      averageFormScore: asNumber(data.averageFormScore) ?? null,
      bestFormScore: asNumber(data.bestFormScore) ?? null,
      verdict:
        data.verdict === 'good' || data.verdict === 'needs-work' || data.verdict === 'insufficient-data'
          ? data.verdict
          : 'insufficient-data',
      source: data.source === 'video' ? 'video' : 'camera',
    })
  }
  return {
    sessions,
    truncated: snapshot.docs.length > max,
    cappedAt: max,
  }
}
