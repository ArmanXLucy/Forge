import type { AIMonitoringEventRecord, AdminAISessionSummary } from './records'

export interface DailyActivityPoint {
  date: string
  events: number | null
  errors: number | null
}

export interface NamedCount {
  name: string
  count: number
}

export interface MonitoringLatency {
  basis: 'per-inference' | 'per-session-average'
  sampleCount: number
  inferenceCount: number
  avgMs: number | null
  p95Ms: number | null
}

export interface RecommendationSummary {
  requested: number
  generated: number
  failed: number
  saved: number
  saveFailed: number
  successRate: number | null
  averageConfidence: number | null
  categories: NamedCount[]
  latency: { sampleCount: number; avgMs: number | null; p95Ms: number | null }
}

export interface CoachSummary {
  started: number
  completed: number
  interrupted: number
  failed: number
  saved: number
  terminal: number
  completionRate: number | null
  failureRate: number | null
  exercises: NamedCount[]
  sources: NamedCount[]
  averageConfidence: number | null
  latency: MonitoringLatency
}

export interface MonitoringSummary {
  totalEvents: number
  uniqueMembers: number
  errorEvents: number
  latestAt: string | null
  eventCounts: NamedCount[]
  errorsByCategory: NamedCount[]
  errorsByCode: NamedCount[]
  models: { name: string; events: number; errors: number; versions: string[] }[]
  daily: DailyActivityPoint[]
  latency: MonitoringLatency
  recommendation: RecommendationSummary
  coach: CoachSummary
}

export interface SavedSessionSummary {
  sessions: number
  members: number
  reps: number
  averageForm: number | null
  bestForm: number | null
  scoredSessions: number
  verdicts: NamedCount[]
  sources: NamedCount[]
  byExercise: {
    exercise: string
    label: string
    sessions: number
    members: number
    reps: number
    averageForm: number | null
  }[]
  latestAt: string | null
}

function countBy(values: (string | undefined)[]): NamedCount[] {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    if (!value) return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

function utcDay(iso: string): string {
  return iso.slice(0, 10)
}

export function buildDailyActivity(
  events: AIMonitoringEventRecord[],
  since: Date,
  now = new Date(),
): DailyActivityPoint[] {
  const byDay = new Map<string, { events: number; errors: number }>()
  events.forEach((event) => {
    const key = utcDay(event.createdAt)
    const item = byDay.get(key) ?? { events: 0, errors: 0 }
    item.events += 1
    if (event.status === 'error') item.errors += 1
    byDay.set(key, item)
  })
  const days: DailyActivityPoint[] = []
  const cursor = new Date(
    Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()),
  )
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  while (cursor.getTime() <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const item = byDay.get(key)
    days.push({ date: key, events: item?.events ?? null, errors: item?.errors ?? null })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/**
 * Pure aggregation over a bounded window. Every ratio is null when its
 * denominator is zero so the UI can say "not measured" instead of "0%".
 */
export function summarizeEvents(
  events: AIMonitoringEventRecord[],
  since: Date,
  now = new Date(),
): MonitoringSummary {
  const recommendationEvents = events.filter((event) => event.feature === 'workout-recommendation')
  const coachEvents = events.filter((event) => event.feature === 'ai-coach')
  const errors = events.filter((event) => event.status === 'error')

  const recRequested = recommendationEvents.filter((event) => event.eventType === 'recommendation.requested').length
  const recGenerated = recommendationEvents.filter((event) => event.eventType === 'recommendation.generated').length
  const recFailed = recommendationEvents.filter((event) => event.eventType === 'recommendation.failed').length
  const recSaved = recommendationEvents.filter((event) => event.eventType === 'recommendation.saved').length
  const recSaveFailed = recommendationEvents.filter((event) => event.eventType === 'recommendation.save_failed').length
  const recConfidences = recommendationEvents
    .filter((event) => event.eventType === 'recommendation.generated')
    .map((event) => event.confidence)
    .filter((value): value is number => typeof value === 'number')

  const coachStarted = coachEvents.filter((event) => event.eventType === 'coach.session.started').length
  const coachCompleted = coachEvents.filter((event) => event.eventType === 'coach.session.completed').length
  const coachInterrupted = coachEvents.filter((event) => event.eventType === 'coach.session.interrupted').length
  const coachFailed = coachEvents.filter((event) => event.eventType === 'coach.session.failed').length
  const coachSaved = coachEvents.filter((event) => event.eventType === 'coach.session.saved').length
  const coachTerminal = coachCompleted + coachInterrupted + coachFailed
  const coachConfidences = coachEvents
    .filter((event) => event.eventType === 'inference.succeeded')
    .map((event) => event.confidence)
    .filter((value): value is number => typeof value === 'number')

  const recommendationLatencies = recommendationEvents
    .filter((event) => event.eventType === 'inference.succeeded')
    .map((event) => event.durationMs)
    .filter((value): value is number => typeof value === 'number' && value >= 0)

  const savedTimingEvents = coachEvents.filter(
    (event) =>
      event.eventType === 'coach.session.saved' &&
      typeof event.inferenceMsSum === 'number' &&
      typeof event.inferenceCount === 'number' &&
      event.inferenceCount > 0,
  )
  const coachTimingSource = savedTimingEvents.length
    ? savedTimingEvents
    : coachEvents.filter(
        (event) =>
          event.eventType === 'coach.session.completed' &&
          typeof event.inferenceMsSum === 'number' &&
          typeof event.inferenceCount === 'number' &&
          event.inferenceCount > 0,
      )
  const coachPerInference = coachTimingSource.map(
    (event) => (event.inferenceMsSum as number) / (event.inferenceCount as number),
  )
  const coachInferenceCount = coachTimingSource.reduce((sum, event) => sum + (event.inferenceCount ?? 0), 0)
  const coachInferenceMs = coachTimingSource.reduce((sum, event) => sum + (event.inferenceMsSum ?? 0), 0)

  const latency: MonitoringLatency =
    recommendationLatencies.length > 0
      ? {
          basis: 'per-inference',
          sampleCount: recommendationLatencies.length,
          inferenceCount: recommendationLatencies.length,
          avgMs: round(average(recommendationLatencies) ?? 0),
          p95Ms: percentile(recommendationLatencies, 0.95),
        }
      : coachPerInference.length > 0
        ? {
            basis: 'per-session-average',
            sampleCount: coachPerInference.length,
            inferenceCount: coachInferenceCount,
            avgMs: coachInferenceMs / coachInferenceCount,
            p95Ms: percentile(coachPerInference, 0.95),
          }
        : { basis: 'per-inference', sampleCount: 0, inferenceCount: 0, avgMs: null, p95Ms: null }

  const modelMap = new Map<string, { events: number; errors: number; versions: Set<string> }>()
  events.forEach((event) => {
    if (!event.modelId) return
    const item = modelMap.get(event.modelId) ?? { events: 0, errors: 0, versions: new Set<string>() }
    item.events += 1
    if (event.status === 'error') item.errors += 1
    if (event.modelVersion) item.versions.add(event.modelVersion)
    modelMap.set(event.modelId, item)
  })

  return {
    totalEvents: events.length,
    uniqueMembers: new Set(events.map((event) => event.userId).filter(Boolean)).size,
    errorEvents: errors.length,
    latestAt: events.length ? events[0].createdAt : null,
    eventCounts: countBy(events.map((event) => event.eventType)).sort((a, b) => b.count - a.count),
    errorsByCategory: countBy(errors.map((event) => event.errorCategory ?? 'unknown')),
    errorsByCode: countBy(errors.map((event) => event.errorCode ?? 'unspecified')).slice(0, 10),
    models: [...modelMap.entries()]
      .map(([name, item]) => ({ name, events: item.events, errors: item.errors, versions: [...item.versions] }))
      .sort((a, b) => b.events - a.events),
    daily: buildDailyActivity(events, since, now),
    latency,
    recommendation: {
      requested: recRequested,
      generated: recGenerated,
      failed: recFailed,
      saved: recSaved,
      saveFailed: recSaveFailed,
      successRate: recRequested > 0 ? recGenerated / recRequested : null,
      averageConfidence: average(recConfidences),
      latency: {
        sampleCount: recommendationLatencies.length,
        avgMs: average(recommendationLatencies),
        p95Ms: percentile(recommendationLatencies, 0.95),
      },
      categories: countBy(
        recommendationEvents
          .filter((event) => event.eventType === 'recommendation.generated')
          .map((event) => event.category),
      ),
    },
    coach: {
      started: coachStarted,
      completed: coachCompleted,
      interrupted: coachInterrupted,
      failed: coachFailed,
      saved: coachSaved,
      terminal: coachTerminal,
      completionRate: coachTerminal > 0 ? coachCompleted / coachTerminal : null,
      failureRate: coachTerminal > 0 ? coachFailed / coachTerminal : null,
      exercises: countBy(
        coachEvents.filter((event) => event.eventType === 'coach.session.started').map((event) => event.exercise),
      ),
      sources: countBy(
        coachEvents.filter((event) => event.eventType === 'coach.session.started').map((event) => event.source),
      ),
      averageConfidence: average(coachConfidences),
      latency: {
        basis: 'per-session-average',
        sampleCount: coachPerInference.length,
        inferenceCount: coachInferenceCount,
        avgMs: coachInferenceCount > 0 ? coachInferenceMs / coachInferenceCount : null,
        p95Ms: percentile(coachPerInference, 0.95),
      },
    },
  }
}

export function summarizeSavedSessions(sessions: AdminAISessionSummary[]): SavedSessionSummary {
  const members = new Set(sessions.map((session) => session.userId).filter(Boolean))
  // "Insufficient data" is not a form judgement. Older records may still
  // carry a numeric placeholder, so never average that verdict as a score.
  const scored = sessions.filter(
    (session): session is AdminAISessionSummary & { averageFormScore: number } =>
      typeof session.averageFormScore === 'number' && session.verdict !== 'insufficient-data',
  )
  const byExercise = new Map<
    string,
    { label: string; sessions: number; members: Set<string>; reps: number; scores: number[] }
  >()
  sessions.forEach((session) => {
    const item = byExercise.get(session.exercise) ?? {
      label: session.exerciseLabel,
      sessions: 0,
      members: new Set<string>(),
      reps: 0,
      scores: [],
    }
    item.sessions += 1
    item.reps += session.reps
    if (session.userId) item.members.add(session.userId)
    if (typeof session.averageFormScore === 'number' && session.verdict !== 'insufficient-data') {
      item.scores.push(session.averageFormScore)
    }
    byExercise.set(session.exercise, item)
  })

  return {
    sessions: sessions.length,
    members: members.size,
    reps: sessions.reduce((sum, session) => sum + session.reps, 0),
    averageForm: average(scored.map((session) => session.averageFormScore)),
    bestForm: scored.reduce<number | null>(
      (best, session) =>
        typeof session.bestFormScore === 'number' ? (best === null ? session.bestFormScore : Math.max(best, session.bestFormScore)) : best,
      null,
    ),
    scoredSessions: scored.length,
    verdicts: countBy(sessions.map((session) => session.verdict)),
    sources: countBy(sessions.map((session) => session.source)),
    byExercise: [...byExercise.entries()]
      .map(([exercise, item]) => ({
        exercise,
        label: item.label,
        sessions: item.sessions,
        members: item.members.size,
        reps: item.reps,
        averageForm: average(item.scores),
      }))
      .sort((a, b) => b.sessions - a.sessions),
    latestAt: sessions.length
      ? sessions.reduce((latest, session) => (session.completedAt > latest ? session.completedAt : latest), sessions[0].completedAt)
      : null,
  }
}

export function formatPercent(value: number | null, digits = 1): string {
  return value === null ? '—' : (value * 100).toFixed(digits) + '%'
}

export function formatMs(value: number | null): string {
  if (value === null) return '—'
  return value >= 1000 ? (value / 1000).toFixed(2) + ' s' : Math.round(value) + ' ms'
}

export function formatMetric(value: number | null, digits = 3): string {
  return value === null ? '—' : value.toFixed(digits)
}
