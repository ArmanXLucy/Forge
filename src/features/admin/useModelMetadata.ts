import { useEffect, useState } from 'react'

export interface AIModelMetadata {
  version: string
  class_order: string[]
  thresholds: Record<string, number>
  feature_order: string[]
  notes: string[]
}

export function useModelMetadata() {
  const [metadata, setMetadata] = useState<AIModelMetadata | null>(null)
  const [available, setAvailable] = useState<{ squat: boolean; bicep_curl: boolean; push_up: boolean } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/models/model_metadata.json').then((response) => {
        if (!response.ok) throw new Error('Model metadata could not be loaded.')
        return response.json() as Promise<AIModelMetadata>
      }),
      ...(['squat', 'bicep_curl', 'push_up'] as const).map((exercise) =>
        fetch(`/models/form_classifier_${exercise}.onnx`, { method: 'HEAD' }).then((response) => [exercise, response.ok] as const),
      ),
    ])
      .then(([meta, ...files]) => {
        if (cancelled) return
        setMetadata(meta)
        setAvailable({
          squat: Boolean(files.find(([key]) => key === 'squat')?.[1]),
          bicep_curl: Boolean(files.find(([key]) => key === 'bicep_curl')?.[1]),
          push_up: Boolean(files.find(([key]) => key === 'push_up')?.[1]),
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { metadata, available, status }
}
