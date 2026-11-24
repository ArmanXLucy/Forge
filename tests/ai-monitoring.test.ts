import { describe, expect, it } from 'vitest'
import {
  buildDailyActivity,
  formatPercent,
  summarizeEvents,
  summarizeSavedSessions,
} from '../src/features/ai-monitoring/aggregate'
import type {
  AIMonitoringEventRecord,
  AdminAISessionSummary,
} from '../src/features/ai-monitoring/records'

function event(overrides: Partial<AIMonitoringEventRecord> = {}): AIMonitoringEventRecord {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'alice',
    feature: 'workout-recommendation',
    eventType: 'recommendation.requested',
    status: 'info',
    createdAt: '2026-01-02T10:00:00.000Z',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sessionRef: 'rec_test',
    ...overrides,
  }
}

function session(overrides: Partial<AdminAISessionSummary> = {}): AdminAISessionSummary {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'alice',
    exercise: 'squat',
    exerciseLabel: 'Squat',
    completedAt: '2026-01-02T10:00:00.000Z',
    durationSeconds: 60,
    reps: 8,
    averageFormScore: 0.7,
    bestFormScore: 0.8,
    verdict: 'good',
    source: 'camera',
    ...overrides,
  }
}

const SINCE = new Date('2026-01-01T00:00:00.000Z')
const NOW = new Date('2026-01-03T12:00:00.000Z')

describe('AI monitoring aggregation', () => {
  it('reports unknown ratios as null instead of zero', () => {
    const summary = summarizeEvents([], SINCE, NOW)
    expect(summary.recommendation.successRate).toBeNull()
    expect(summary.recommendation.latency.avgMs).toBeNull()
    expect(summary.coach.completionRate).toBeNull()
    expect(summary.coach.failureRate).toBeNull()
    expect(summary.latency.avgMs).toBeNull()
    expect(formatPercent(null)).toBe('—')
  })

  it('counts recommendations, failures and measured latency separately', () => {
    const events = [
      event({ eventType: 'recommendation.requested' }),
      event({ eventType: 'recommendation.requested', userId: 'bob' }),
      event({ eventType: 'recommendation.generated', category: 'Bodyweight Circuit', confidence: 0.9, status: 'ok' }),
      event({
        eventType: 'recommendation.failed',
        status: 'error',
        errorCategory: 'inference',
        errorCode: 'inference-failed',
      }),
      event({ eventType: 'inference.succeeded', durationMs: 100, confidence: 0.9 }),
      event({ eventType: 'inference.succeeded', durationMs: 300, confidence: 0.8, userId: 'bob' }),
    ]
    const summary = summarizeEvents(events, SINCE, NOW)
    expect(summary.recommendation.requested).toBe(2)
    expect(summary.recommendation.generated).toBe(1)
    expect(summary.recommendation.failed).toBe(1)
    expect(summary.recommendation.successRate).toBe(0.5)
    expect(summary.recommendation.latency.sampleCount).toBe(2)
    expect(summary.recommendation.latency.avgMs).toBe(200)
    expect(summary.recommendation.averageConfidence).toBeCloseTo(0.9)
    expect(summary.uniqueMembers).toBe(2)
    expect(summary.errorEvents).toBe(1)
    expect(summary.errorsByCategory).toEqual([{ name: 'inference', count: 1 }])
  })

  it('uses finished coach attempts as the completion denominator', () => {
    const events = [
      event({ feature: 'ai-coach', eventType: 'coach.session.started' }),
      event({ feature: 'ai-coach', eventType: 'coach.session.started', userId: 'bob' }),
      event({ feature: 'ai-coach', eventType: 'coach.session.completed', status: 'ok' }),
      event({ feature: 'ai-coach', eventType: 'coach.session.interrupted' }),
      event({ feature: 'ai-coach', eventType: 'coach.session.failed', status: 'error', errorCategory: 'camera' }),
      event({ feature: 'ai-coach', eventType: 'coach.session.failed', status: 'error', errorCategory: 'camera' }),
    ]
    const summary = summarizeEvents(events, SINCE, NOW)
    expect(summary.coach.started).toBe(2)
    expect(summary.coach.terminal).toBe(4)
    expect(summary.coach.completionRate).toBe(0.25)
    expect(summary.coach.failureRate).toBe(0.5)
    expect(summary.errorsByCategory).toEqual([{ name: 'camera', count: 2 }])
  })

  it('weights coach latency by scored windows and ignores duplicate completed events', () => {
    const events = [
      event({
        feature: 'ai-coach',
        eventType: 'coach.session.saved',
        inferenceMsSum: 300,
        inferenceCount: 3,
        status: 'ok',
      }),
      event({
        feature: 'ai-coach',
        eventType: 'coach.session.saved',
        inferenceMsSum: 100,
        inferenceCount: 2,
        status: 'ok',
        userId: 'bob',
      }),
      event({
        feature: 'ai-coach',
        eventType: 'coach.session.completed',
        inferenceMsSum: 999,
        inferenceCount: 99,
        status: 'ok',
      }),
    ]
    const summary = summarizeEvents(events, SINCE, NOW)
    expect(summary.coach.latency.avgMs).toBe(80)
    expect(summary.coach.latency.inferenceCount).toBe(5)
    expect(summary.coach.latency.sampleCount).toBe(2)
  })

  it('omits days with no events instead of plotting zero', () => {
    const daily = buildDailyActivity([event({ createdAt: '2026-01-02T10:00:00.000Z' })], SINCE, NOW)
    expect(daily).toHaveLength(3)
    expect(daily[0]).toEqual({ date: '2026-01-01', events: null, errors: null })
    expect(daily[1]).toEqual({ date: '2026-01-02', events: 1, errors: 0 })
    expect(daily[2]).toEqual({ date: '2026-01-03', events: null, errors: null })
  })
})

describe('saved AI Coach session aggregation', () => {
  it('averages only scored sessions and distinguishes no scores from zero', () => {
    const summary = summarizeSavedSessions([
      session({ averageFormScore: 0.6, bestFormScore: 0.7 }),
      session({ userId: 'bob', averageFormScore: 0.8, bestFormScore: 0.9, reps: 10 }),
      session({ userId: 'bob', averageFormScore: 0, bestFormScore: 0, verdict: 'insufficient-data', reps: 0 }),
    ])
    expect(summary.sessions).toBe(3)
    expect(summary.members).toBe(2)
    expect(summary.reps).toBe(18)
    expect(summary.scoredSessions).toBe(2)
    expect(summary.averageForm).toBeCloseTo(0.7)
    expect(summary.bestForm).toBe(0.9)
    expect(summary.verdicts.find((item) => item.name === 'insufficient-data')?.count).toBe(1)
  })

  it('returns null averages when nothing was scored', () => {
    const summary = summarizeSavedSessions([session({ averageFormScore: null, bestFormScore: null })])
    expect(summary.averageForm).toBeNull()
    expect(summary.scoredSessions).toBe(0)
  })
})
