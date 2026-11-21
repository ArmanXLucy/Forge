import { useCallback, useEffect, useState } from 'react'
import { getAdminSnapshot } from '../../services/cloud/adminRepository'
import type { AdminSnapshot } from '../../types/admin'

export function useAdminSnapshot() {
  const [data, setData] = useState<AdminSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminSnapshot()
      .then((snapshot) => {
        if (cancelled) return
        setData(snapshot)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError((reason as Error).message || 'Could not load platform data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  return { data, loading, error, refresh }
}
