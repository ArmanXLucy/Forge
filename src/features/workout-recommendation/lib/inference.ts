import * as ort from 'onnxruntime-web/wasm'
import type { ModelInput } from '../types'

const MODEL_URL = '/models/workout_recommendation.onnx'
const SCHEMA_URL = '/models/feature_schema.json'

// Vite cannot module-import the WASM glue from public/ in dev, so use the
// version-pinned CDN distribution (same approach as the existing AI Coach).
const ORT_VERSION = '1.31.1'
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
ort.env.wasm.numThreads = 1
ort.env.logLevel = 'error'

export type InferenceErrorCode =
  | 'model-unavailable'
  | 'invalid-input'
  | 'inference-failed'
  | 'schema-unavailable'

export class InferenceError extends Error {
  code: InferenceErrorCode
  detail?: unknown
  constructor(code: InferenceErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'InferenceError'
    this.code = code
    this.detail = options?.cause
  }
}

interface FeatureSchema {
  numeric_features: string[]
  categorical_features: string[]
  categorical_values: Record<string, string[]>
  target_labels: string[]
  model_version: string
  onnx_inputs: Array<{ name: string; shape: number[]; type: string }>
  onnx_outputs: Array<{ name: string; shape: number[]; type: string }>
}

export interface PredictionResult {
  label: string
  confidence: number
  probabilities: Array<{ label: string; probability: number }>
  inferenceMs: number
  modelVersion: string
}

let schemaPromise: Promise<FeatureSchema> | null = null
let sessionPromise: Promise<ort.InferenceSession> | null = null

export function loadFeatureSchema(): Promise<FeatureSchema> {
  if (!schemaPromise) {
    schemaPromise = fetch(SCHEMA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<FeatureSchema>
      })
      .catch((error) => {
        schemaPromise = null
        throw new InferenceError('schema-unavailable', 'Could not load the model feature schema.', {
          cause: error,
        })
      })
  }
  return schemaPromise
}

async function getSession() {
  if (typeof WebAssembly === 'undefined') {
    throw new InferenceError(
      'model-unavailable',
      'This browser does not support WebAssembly, so the workout model cannot run locally.',
    )
  }
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const response = await fetch(MODEL_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = await response.arrayBuffer()
      return ort.InferenceSession.create(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
    })().catch((error) => {
      sessionPromise = null
      throw new InferenceError(
        'model-unavailable',
        'The workout model could not be loaded in this browser. Check WebAssembly support, your connection, and that the ONNX artifact is deployed.',
        { cause: error },
      )
    })
  }
  return sessionPromise
}

function validate(modelInput: ModelInput, schema: FeatureSchema) {
  const problems: string[] = []
  const age = modelInput.Age
  if (!Number.isFinite(age) || age < 16 || age > 90) problems.push('Age is outside 16–90')
  if (!Number.isFinite(modelInput.Weight_kg) || modelInput.Weight_kg < 30 || modelInput.Weight_kg > 300) {
    problems.push('Weight is outside 30–300 kg')
  }
  if (!Number.isFinite(modelInput.Height_cm) || modelInput.Height_cm < 120 || modelInput.Height_cm > 230) {
    problems.push('Height is outside 120–230 cm')
  }
  if (![...(schema.categorical_values.Gender ?? []), 'Unspecified'].includes(modelInput.Gender)) {
    problems.push('Unknown gender value')
  }
  if (!schema.categorical_values.Goal?.includes(modelInput.Goal)) problems.push('Unknown goal value')
  if (!schema.categorical_values.Equipment?.includes(modelInput.Equipment)) problems.push('Unknown equipment value')
  if (!schema.categorical_values.Experience?.includes(modelInput.Experience)) {
    problems.push('Unknown experience value')
  }
  if (!schema.categorical_values.Injury?.includes(modelInput.Injury)) problems.push('Unknown injury value')
  if (problems.length > 0) {
    throw new InferenceError('invalid-input', `Invalid model input: ${problems.join('; ')}`)
  }
}

export async function predictPlanCategory(modelInput: ModelInput): Promise<PredictionResult> {
  const [session, schema] = await Promise.all([getSession(), loadFeatureSchema()])
  validate(modelInput, schema)

  const bmi = modelInput.Weight_kg / (modelInput.Height_cm / 100) ** 2
  const feed: Record<string, ort.Tensor> = {}
  const numericValues: Record<string, number> = {
    Age: modelInput.Age,
    Weight_kg: modelInput.Weight_kg,
    Height_cm: modelInput.Height_cm,
    BMI: bmi,
  }
  for (const feature of schema.numeric_features) {
    feed[feature] = new ort.Tensor('float32', new Float32Array([numericValues[feature] ?? 0]), [1, 1])
  }
  for (const feature of schema.categorical_features) {
    const value = String((modelInput as unknown as Record<string, unknown>)[feature] ?? '')
    feed[feature] = new ort.Tensor('string', [value], [1, 1])
  }

  try {
    const started = performance.now()
    const outputs = await session.run(feed)
    const inferenceMs = performance.now() - started

    const outputNames = session.outputNames
    const labelName =
      outputNames.find((name) => name === 'label') ??
      schema.onnx_outputs.find((output) => output.type.includes('int'))?.name ??
      outputNames[0]
    const probabilityName =
      outputNames.find((name) => name === 'probabilities') ??
      outputNames.find((name) => name !== labelName) ??
      outputNames[1]

    const labelTensor = outputs[labelName]
    const probabilityTensor = outputs[probabilityName]
    if (!labelTensor || !probabilityTensor) {
      throw new Error('Model did not return label and probability outputs')
    }

    const labelIndex = Number(labelTensor.data[0])
    const probabilities = Array.from(probabilityTensor.data as Float32Array | number[]).map(
      (probability, index) => ({
        label: schema.target_labels[index] ?? `class-${index}`,
        probability,
      }),
    )
    const label = schema.target_labels[labelIndex] ?? probabilities.reduce((best, entry) => (entry.probability > best.probability ? entry : best), probabilities[0])?.label
    if (!label) throw new Error('Model returned an unknown class label')

    const confidence = probabilities.find((entry) => entry.label === label)?.probability ?? 0
    return {
      label,
      confidence,
      probabilities: [...probabilities].sort((a, b) => b.probability - a.probability),
      inferenceMs,
      modelVersion: schema.model_version,
    }
  } catch (error) {
    if (error instanceof InferenceError) throw error
    throw new InferenceError('inference-failed', 'ONNX inference failed.', { cause: error })
  }
}

// Warm the session after the first paint so the generate action feels instant.
export function preloadWorkoutModel() {
  if (typeof window === 'undefined') return
  const run = () => {
    getSession().catch(() => undefined)
    loadFeatureSchema().catch(() => undefined)
  }
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => void
  }
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(run)
  } else {
    window.setTimeout(run, 1200)
  }
}
