import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, firestore, isFirestoreConfigured } from '../../lib/firebase'
import type { AIMonitoringEventInput } from '../../features/ai-monitoring/types'

// Phase 4 monitoring is deliberately fire-and-forget. It must never throw into
// an AI call site, never block a prediction, and never retain data when the
// cloud is unavailable. A failed telemetry write is not an AI failure.

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || '1.0.0'
const COLLECTION = 'ai_monitoring_events'
const QUEUE_LIMIT = 25
const FLUSH_DELAY_MS = 1200
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 100
const ERROR_DEDUPE_MS = 60_000
const MESSAGE_LIMIT = 240

interface QueuedEvent {
  id: string
  userId: string
  payload: Record<string, unknown>
}

let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let rateWindowStartedAt = 0
let rateCount = 0
const recentErrors = new Map<string, number>()

function randomId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

export function createMonitoringSessionRef(prefix: 'rec' | 'coach'): string {
  return `${prefix}_${randomId().replace(/-/g, '').slice(0, 20)}`
}

/** True only when a real signed-in Firebase user and Firestore are available. */
export function isAIMonitoringEnabled(): boolean {
  if (!isFirestoreConfigured || !firestore) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  const user = auth?.currentUser
  return Boolean(user && !user.isAnonymous)
}

const URL_PATTERN = /https?:\/\/\S+/gi
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g

/**
 * Error messages are member-facing strings and can contain URLs or tokens.
 * Keep a short diagnostic that is safe to store and show to administrators.
 */
export function sanitizeMonitoringMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value
    .replace(URL_PATTERN, '[url]')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(TOKEN_PATTERN, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned ? cleaned.slice(0, MESSAGE_LIMIT) : undefined
}

function withinRateLimit(): boolean {
  const now = Date.now()
  if (now - rateWindowStartedAt > RATE_WINDOW_MS) {
    rateWindowStartedAt = now
    rateCount = 0
  }
  if (rateCount >= RATE_LIMIT) return false
  rateCount += 1
  return true
}

function isDuplicateError(input: AIMonitoringEventInput): boolean {
  if (input.status !== 'error') return false
  const key = [input.eventType, input.sessionRef ?? '-', input.errorCode ?? '-', input.exercise ?? '-'].join(':')
  const now = Date.now()
  const previous = recentErrors.get(key)
  if (previous && now - previous < ERROR_DEDUPE_MS) return true
  recentErrors.set(key, now)
  if (recentErrors.size > 100) {
    for (const [entry, at] of recentErrors) {
      if (now - at > ERROR_DEDUPE_MS) recentErrors.delete(entry)
    }
  }
  return false
}

function toPayload(input: AIMonitoringEventInput, userId: string, eventId: string) {
  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    eventId,
    userId,
    appVersion: APP_VERSION,
    feature: input.feature,
    eventType: input.eventType,
    status: input.status,
    createdAt: serverTimestamp(),
  }
  const optional: Array<[keyof AIMonitoringEventInput, unknown]> = [
    ['sessionRef', input.sessionRef],
    ['modelId', input.modelId],
    ['modelVersion', input.modelVersion],
    ['exercise', input.exercise],
    ['category', input.category],
    ['confidence', input.confidence],
    ['durationMs', input.durationMs],
    ['inferenceMsSum', input.inferenceMsSum],
    ['inferenceCount', input.inferenceCount],
    ['goodCount', input.goodCount],
    ['badCount', input.badCount],
    ['reps', input.reps],
    ['errorCount', input.errorCount],
    ['errorCategory', input.errorCategory],
    ['errorCode', input.errorCode],
    ['source', input.source],
  ]
  for (const [key, value] of optional) {
    if (value !== undefined && value !== null) payload[key] = value
  }
  const message = sanitizeMonitoringMessage(input.message)
  if (message) payload.message = message
  return payload
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushAIMonitoring()
  }, FLUSH_DELAY_MS)
}

/**
 * Queue one monitoring event. Safe to call from any AI path: it never throws,
 * never awaits a network call and silently drops events when monitoring is
 * unavailable, rate-limited, or full.
 */
export function trackAIEvent(input: AIMonitoringEventInput): void {
  try {
    if (!isAIMonitoringEnabled()) return
    if (!withinRateLimit()) return
    if (isDuplicateError(input)) return
    const userId = auth?.currentUser?.uid
    if (!userId) return
    const eventId = randomId()
    queue.push({ id: eventId, userId, payload: toPayload(input, userId, eventId) })
    if (queue.length >= QUEUE_LIMIT) {
      void flushAIMonitoring()
      return
    }
    scheduleFlush()
  } catch {
    // Monitoring must never break the AI feature.
  }
}

/**
 * Write the queued events. Resolves after all writes settle; every rejection
 * is swallowed. Exported for retry hooks and tests, not for UI use.
 */
export async function flushAIMonitoring(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!queue.length) return
  const batch = queue
  queue = []
  if (!isAIMonitoringEnabled() || !firestore) return
  const activeUid = auth?.currentUser?.uid
  if (!activeUid) return
  const store = firestore
  await Promise.allSettled(
    batch
      .filter((item) => item.userId === activeUid)
      .map((item) =>
        setDoc(doc(collection(store, COLLECTION), item.id), {
          ...item.payload,
          createdAt: serverTimestamp(),
        }),
      ),
  )
}

/** Test hook: clears queued/timing state without affecting Firebase. */
export function resetAIMonitoringQueueForTests(): void {
  queue = []
  if (flushTimer !== null) clearTimeout(flushTimer)
  flushTimer = null
  rateWindowStartedAt = 0
  rateCount = 0
  recentErrors.clear()
}