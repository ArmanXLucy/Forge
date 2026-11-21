import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabaseProjectUrl, supabasePublishableKey } from '../lib/supabase'

export type StorageHealth =
  | 'unconfigured'
  | 'checking'
  | 'ok'
  | 'missing-bucket'
  | 'function-missing'
  | 'error'

const FUNCTION_URL = import.meta.env.VITE_SUPABASE_UPLOAD_FUNCTION_URL as string | undefined

export function useSupabaseStorageHealth(): StorageHealth {
  const [status, setStatus] = useState<StorageHealth>(
    isSupabaseConfigured ? 'checking' : 'unconfigured',
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseProjectUrl || !supabasePublishableKey) {
      setStatus('unconfigured')
      return
    }
    const projectUrl = supabaseProjectUrl
    const publishableKey = supabasePublishableKey
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)

    const check = async () => {
      try {
        const bucketResponse = await fetch(
          `${projectUrl.replace(/\/$/, '')}/storage/v1/object/list/profile-images`,
          {
            method: 'POST',
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${publishableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefix: '', limit: 1 }),
            signal: controller.signal,
          },
        )
        if (cancelled) return
        if (!bucketResponse.ok) {
          const body = await bucketResponse.text()
          setStatus(/bucket not found/i.test(body) ? 'missing-bucket' : 'error')
          return
        }

        if (!FUNCTION_URL) {
          setStatus('ok')
          return
        }

        // The uploader prefers the Edge Function. A 404 (or a CORS failure
        // caused by a 404 without CORS headers) means the function is not
        // deployed, so uploads would fail even though the bucket exists.
        try {
          const functionResponse = await fetch(FUNCTION_URL, {
            method: 'OPTIONS',
            signal: controller.signal,
          })
          if (cancelled) return
          if (functionResponse.status === 404) {
            setStatus('function-missing')
            return
          }
          setStatus(functionResponse.ok ? 'ok' : 'error')
        } catch {
          if (!cancelled) setStatus('function-missing')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void check()
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [])

  return status
}
