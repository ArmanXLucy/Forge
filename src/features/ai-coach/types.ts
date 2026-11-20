export type ExerciseKey = 'squat' | 'bicep_curl' | 'push_up'

export interface Landmark {
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseFrame {
  t: number
  p: Landmark[]
}

export interface ModelMetadata {
  version: string
  unit: string
  feature_order: string[]
  class_order: [string, string]
  thresholds: Record<ExerciseKey, number>
  notes: string[]
}

export interface ExerciseConfig {
  key: ExerciseKey
  label: string
  shortLabel: string
  primaryAngleLabel: string
  defaultThreshold: number
  cameraHint: string
  cues: string[]
  requiredLandmarks: number[]
}

export const EXERCISES: Record<ExerciseKey, ExerciseConfig> = {
  squat: {
    key: 'squat',
    label: 'Squat',
    shortLabel: 'Squat',
    primaryAngleLabel: 'Knee angle',
    defaultThreshold: 0.66,
    cameraHint: 'Stand side-on, full body in frame, feet visible.',
    requiredLandmarks: [11, 12, 23, 24, 25, 26, 27, 28],
    cues: ['Keep the whole body visible', 'Use a stable side or 45° view', 'Move at a controlled tempo'],
  },
  bicep_curl: {
    key: 'bicep_curl',
    label: 'Bicep curl',
    shortLabel: 'Curl',
    primaryAngleLabel: 'Elbow angle',
    defaultThreshold: 0.64,
    cameraHint: 'Face the camera from the waist up, with both arms visible.',
    requiredLandmarks: [11, 12, 13, 14],
    cues: ['Keep shoulders and wrists in frame', 'Stand in even light', 'Avoid swinging the torso'],
  },
  push_up: {
    key: 'push_up',
    label: 'Push-up',
    shortLabel: 'Push-up',
    primaryAngleLabel: 'Elbow angle',
    defaultThreshold: 0.58,
    cameraHint: 'Place the camera side-on at floor level, full body visible.',
    requiredLandmarks: [11, 12, 13, 14, 23, 24, 25, 26, 27, 28],
    cues: ['Keep the whole body in frame', 'Use a side view', 'Move slowly enough for clear reps'],
  },
}

export type AIVerdict = 'good' | 'needs-work' | 'insufficient-data'

export interface ScoreResult {
  pGood: number
  pBad: number
  threshold: number
  verdict: AIVerdict
  features: Record<string, number>
}

export interface SessionState {
  exercise: ExerciseKey
  phase: 'idle' | 'requesting' | 'loading' | 'live' | 'paused' | 'finished'
  frames: number
  reps: number
  elapsed: number
  poseVisible: boolean
  detectionRate: number
  formVerdict: AIVerdict
  pGood: number | null
  scores: import('../../types/activity').AISessionScore[]
  error: string | null
  source: 'camera' | 'video' | null
}
