import { useCallback, useEffect, useState } from 'react'
import { listMonitoringErrors } from '../../services/cloud/aiMonitoringRepository'
import type { AIMonitoringEventRecord } from './records'
import type { AIMonitoringFeature } from './types'
import type { MonitoringRange } from './useAIMonitoring'

export type ErrorFeatureFilter = 'all' | AIMonitoringFeature

function friendlyError(reason: unknown): string {
  const code = (reason as { code?: string })?.code
  if (code === 'permission-denied') return 'Your admin role cannot read the AI error log.'
  if (code === 'failed-precondition') return 'The AI error log index is still building. Try again shortly.'
  if (code === 'unavailable') return 'The AI error log is temporarily unavailable. Retry when online.'
  return (reason as Error)?.message || 'Could not load AI error events.'
}

export function useAIErrors(days: MonitoringRange, feature: ErrorFeatureFilter) {
  const [events, setEvents] = useState<AIMonitoringEventRecord[]>([])
  const [truncated, setTruncated] = useState(false)
  const [cappedAt, setCappedAt] = useState(0)
  const [windowStart, setWindowStart] = useState(new Date().toISOString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    listMonitoringErrors({
      since,
      feature: feature === 'all' ? undefined : feature,
    })
      .then((result) => {
        if (cancelled) return
        setEvents(result.events)
        setTruncated(result.truncated)
        setCappedAt(result.cappedAt)
        setWindowStart(result.windowStart)
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
  }, [days, feature, version])

  return { events, truncated, cappedAt, windowStart, loading, error, refresh }
}
