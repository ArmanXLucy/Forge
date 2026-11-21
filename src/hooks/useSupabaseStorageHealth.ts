import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabaseProjectUrl, supabasePublishableKey } from '../lib/supabase'

export type StorageHealth = 'unconfigured' | 'checking' | 'ok' | 'missing-bucket' | 'error'

export function useSupabaseStorageHealth(): StorageHealth {
  const [status, setStatus] = useState<StorageHealth>(
    isSupabaseConfigured ? 'checking' : 'unconfigured',
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseProjectUrl || !supabasePublishableKey) {
      setStatus('unconfigured')
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    fetch(`${supabaseProjectUrl.replace(/\/$/, '')}/storage/v1/bucket/profile-images`, {
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (cancelled) return
        if (response.ok) {
          setStatus('ok')
          return
        }
        const body = await response.text()
        setStatus(/bucket not found/i.test(body) ? 'missing-bucket' : 'error')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [])

  return status
}
