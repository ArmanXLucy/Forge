import { featureVector, clipFeatures } from './featurePipeline'
import type { ExerciseKey, ModelMetadata, PoseFrame, ScoreResult } from '../types'

const ORT_VERSION = '1.19.2'
const VISION_VERSION = '0.10.14'
const ORT_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.mjs`
const ORT_WASM_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
const VISION_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/vision_bundle.mjs`
const VISION_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'

type OrtTensor = { data: Float32Array }
type OrtSession = {
  inputNames: string[]
  outputNames: string[]
  run: (inputs: Record<string, unknown>) => Promise<Record<string, OrtTensor>>
}
type OrtRuntime = {
  env: { wasm: { wasmPaths: string } }
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown
  InferenceSession: {
    create: (path: string, options: Record<string, unknown>) => Promise<OrtSession>
  }
}

export interface AIClient {
  metadata: ModelMetadata
  score: (exercise: ExerciseKey, frames: PoseFrame[]) => Promise<ScoreResult>
  features: (exercise: ExerciseKey, frames: PoseFrame[]) => Record<string, number>
  dispose: () => Promise<void>
}

let clientPromise: Promise<AIClient> | null = null
let posePromise: Promise<unknown> | null = null

async function importExternal<T>(url: string): Promise<T> {
  return import(/* @vite-ignore */ url) as Promise<T>
}

export function loadAIClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const metadataResponse = await fetch('/models/model_metadata.json')
      if (!metadataResponse.ok) throw new Error('Model metadata could not be loaded.')
      const metadata = (await metadataResponse.json()) as ModelMetadata

      const ort = await importExternal<OrtRuntime>(ORT_URL)
      ort.env.wasm.wasmPaths = ORT_WASM_BASE

      const sessions = {} as Record<ExerciseKey, OrtSession>
      await Promise.all(
        (['squat', 'bicep_curl', 'push_up'] as ExerciseKey[]).map(async (exercise) => {
          sessions[exercise] = await ort.InferenceSession.create(
            `/models/form_classifier_${exercise}.onnx`,
            { executionProviders: ['wasm'] },
          )
        }),
      )

      return {
        metadata,
        features: (exercise, frames) => clipFeatures(frames, exercise),
        score: async (exercise, frames) => {
          if (frames.length < 20) {
            throw new Error('Record at least two seconds of movement before scoring.')
          }
          const session = sessions[exercise]
          const vector = featureVector(frames, exercise, metadata.feature_order)
          const inputName = session.inputNames[0] ?? 'input'
          const output = await session.run({
            [inputName]: new ort.Tensor('float32', vector, [1, metadata.feature_order.length]),
          })
          const key =
            Object.keys(output).find((name) => /probab/i.test(name)) ?? session.outputNames[0]
          const probabilities = output[key].data
          const pBad = probabilities[0]
          const pGood = probabilities[1]
          const threshold = metadata.thresholds[exercise]
          return {
            pGood,
            pBad,
            threshold,
            verdict: pGood >= threshold ? 'good' : 'needs-work',
            features: clipFeatures(frames, exercise),
          }
        },
        dispose: async () => {
          // onnxruntime-web exposes release only on some builds; sessions are GC'd with the page.
        },
      } satisfies AIClient
    })().catch((error) => {
      clientPromise = null
      throw error
    })
  }
  return clientPromise
}

export function loadPoseLandmarker() {
  if (!posePromise) {
    posePromise = (async () => {
      const vision = await importExternal<{
        FilesetResolver: {
          forVisionTasks: (path: string) => Promise<unknown>
        }
        PoseLandmarker: {
          createFromOptions: (
            fileset: unknown,
            options: Record<string, unknown>,
          ) => Promise<unknown>
        }
      }>(VISION_URL)
      const fileset = await vision.FilesetResolver.forVisionTasks(VISION_WASM_BASE)
      const options = {
        baseOptions: {
          modelAssetPath: POSE_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      }
      try {
        return await vision.PoseLandmarker.createFromOptions(fileset, options)
      } catch {
        return await vision.PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        })
      }
    })().catch((error) => {
      posePromise = null
      throw error
    })
  }
  return posePromise
}

export function resetAIClient() {
  clientPromise = null
  posePromise = null
}
