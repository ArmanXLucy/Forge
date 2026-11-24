import { useEffect, useState } from 'react'

export interface EvaluationDataset {
  name: string
  description: string
  evaluationUnit: string
  split: string
  sampleCount: number
  participantCount: number | null
  sourceVideos?: number
  allWindows?: number
}

export interface EvaluationMetrics {
  n: number
  accuracy: number
  precision?: number
  recall?: number
  f1?: number
  rocAuc?: number | null
  macroPrecision?: number
  macroRecall?: number
  macroF1?: number
  weightedF1?: number
  labelAgreement?: number
  confusion?: { tnBadCorrect: number; fpBadAsGood: number; fnGoodAsBad: number; tpGoodCorrect: number }
  falseAcceptRate?: number | null
  falseRejectRate?: number | null
  perClass?: Record<string, { support: number; precision: number; recall: number; f1: number }>
  matchesStoredReport?: boolean
}

export interface EvaluationModel {
  id: string
  name: string
  task: string
  feature: string
  version: string
  fileName: string
  sha256: string
  sizeBytes: number
  threshold: number | null
  dataset: EvaluationDataset
  metrics: EvaluationMetrics
  baseline?: {
    source: string
    measuredOn: string
    accuracy: number
    precision?: number
    recall?: number
    f1?: number
    rocAuc?: number
    macroF1?: number
    weightedF1?: number
  }
  reproduction?: { status: string; detail: string }
  runtime?: { backend: string; batchInferenceMs: number; perSampleMs: number }
  limitations: string[]
}

export interface EvaluationReport {
  schemaVersion: number
  generatedAt: string
  generatedBy: string
  official: boolean
  note: string
  environment: Record<string, string>
  datasets: {
    form: {
      name: string
      videos: number
      windows: number
      participants: number
      testParticipants: string[]
      evaluationUnit: string
    }
    recommendation: { name: string; kind: string; testSamples: number }
  }
  models: EvaluationModel[]
}

export function useAIEvaluation() {
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [artifacts, setArtifacts] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/models/evaluation_report.json')
      .then(async (response) => {
        if (!response.ok) throw new Error('Evaluation report is not deployed.')
        return (await response.json()) as EvaluationReport
      })
      .then(async (result) => {
        if (result.schemaVersion !== 1 || !Array.isArray(result.models)) {
          throw new Error('Evaluation report has an unsupported schema.')
        }
        const checks = await Promise.all(
          result.models.map(async (model) => {
            try {
              const response = await fetch('/models/' + model.fileName, { method: 'HEAD' })
              return [model.fileName, response.ok] as const
            } catch {
              return [model.fileName, false] as const
            }
          }),
        )
        if (cancelled) return
        setReport(result)
        setArtifacts(Object.fromEntries(checks))
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError((reason as Error)?.message || 'Evaluation report could not be loaded.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { report, artifacts, status, error }
}
