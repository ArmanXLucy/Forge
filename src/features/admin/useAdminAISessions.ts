import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAdminAISessions } from '../../services/cloud/aiMonitoringRepository'
import type { AdminAISessionSummary } from '../ai-monitoring/records'
import { summarizeSavedSessions } from '../ai-monitoring/aggregate'
import type { MonitoringRange } from '../ai-monitoring/useAIMonitoring'

export function useAdminAISessions(days: MonitoringRange) {
  const [sessions, setSessions] = useState<AdminAISessionSummary[]>([])
  const [truncated, setTruncated] = useState(false)
  const [cappedAt, setCappedAt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    listAdminAISessions({ since })
      .then((result) => {
        if (cancelled) return
        setSessions(result.sessions)
        setTruncated(result.truncated)
        setCappedAt(result.cappedAt)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setSessions([])
        setError((reason as Error)?.message || 'Could not load saved AI Coach sessions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days, version])

  const summary = useMemo(() => summarizeSavedSessions(sessions), [sessions])
  return { sessions, summary, truncated, cappedAt, loading, error, refresh }
}
