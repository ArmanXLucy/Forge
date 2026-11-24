import { useCallback, useEffect, useMemo, useState } from 'react'
import { listMonitoringEvents } from '../../services/cloud/aiMonitoringRepository'
import type { AIMonitoringEventRecord } from './records'
import { summarizeEvents, type MonitoringSummary } from './aggregate'
import type { AIMonitoringFeature } from './types'

export type MonitoringRange = 7 | 30 | 90

export interface MonitoringState {
  events: AIMonitoringEventRecord[]
  summary: MonitoringSummary
  truncated: boolean
  cappedAt: number
  windowStart: string
}

function friendlyError(reason: unknown): string {
  const code = (reason as { code?: string })?.code
  if (code === 'permission-denied') return 'Your admin role cannot read AI monitoring events.'
  if (code === 'failed-precondition') return 'A Firestore index for AI monitoring is still building. Try again shortly.'
  if (code === 'unavailable') return 'AI monitoring is temporarily unavailable. Check your connection and retry.'
  return (reason as Error)?.message || 'Could not load AI monitoring events.'
}

export function useAIMonitoring(feature: AIMonitoringFeature, days: MonitoringRange) {
  const [events, setEvents] = useState<AIMonitoringEventRecord[]>([])
  const [page, setPage] = useState<{ truncated: boolean; cappedAt: number; windowStart: string }>({
    truncated: false,
    cappedAt: 0,
    windowStart: new Date().toISOString(),
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    listMonitoringEvents({ feature, since })
      .then((result) => {
        if (cancelled) return
        setEvents(result.events)
        setPage({
          truncated: result.truncated,
          cappedAt: result.cappedAt,
          windowStart: result.windowStart,
        })
        setError(null)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setEvents([])
        setError(friendlyError(reason))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [feature, days, version])

  const summary = useMemo(
    () => summarizeEvents(events, new Date(page.windowStart)),
    [events, page.windowStart],
  )

  return { events, summary, ...page, loading, error, refresh }
}
