import type { ExperienceLevel, FitnessGoal, MissionProgress, QuickStartProfile } from '../../types'

/** Raw answers persisted per mission. Values mirror the mission form fields. */
export type MissionAnswerValue = string | number | boolean | string[]
export type MissionAnswers = Record<string, MissionAnswerValue>
export type MissionAnswerMap = Record<string, MissionAnswers>

export type ModelGender = 'Male' | 'Female' | 'Unspecified'

export type DatasetGoal =
  | 'Athletic Performance'
  | 'CrossFit'
  | 'Endurance'
  | 'Flexibility'
  | 'General Health'
  | 'Marathon Training'
  | 'Muscle Gain'
  | 'Powerlifting'
  | 'Strength'
  | 'Tone Up'
  | 'Weight Loss'

export type DatasetEquipment =
  | 'Bodyweight Only'
  | 'Full Home Gym'
  | 'Gym Membership'
  | 'Home Dumbbells'
  | 'Yoga Mat'

export type DatasetExperience = 'Advanced' | 'Beginner' | 'Intermediate'

export type InjurySite = 'None' | 'Knee' | 'Ankle' | 'Shoulder' | 'Back'

export interface ModelInput {
  Age: number
  Gender: ModelGender
  Weight_kg: number
  Height_cm: number
  Goal: DatasetGoal
  Equipment: DatasetEquipment
  Experience: DatasetExperience
  Injury: InjurySite
}

export interface RecommendationReadiness {
  ready: boolean
  completedMissions: number
  requiredMissions: number
  completedMissionIds: string[]
  remainingMissionIds: string[]
  missingAnswerMissions: string[]
  invalidFields: string[]
  warnings: string[]
}

export interface ExerciseTemplate {
  id: string
  name: string
  category: 'strength' | 'cardio' | 'mobility' | 'conditioning'
  pattern: ExercisePattern
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: EquipmentTag[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string
  impact: 'low' | 'moderate' | 'high'
  injuryExclusions: InjurySite[]
  goalTags: FitnessGoalLike[]
}

export type ExercisePattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push'
  | 'push-overhead'
  | 'pull'
  | 'pull-vertical'
  | 'core'
  | 'carry'
  | 'run'
  | 'row'
  | 'cycle'
  | 'mobility'
  | 'plyometric'
  | 'conditioning'

export type EquipmentTag = 'gym' | 'dumbbells' | 'bands' | 'bodyweight' | 'cardio' | 'mat'

export type FitnessGoalLike =
  | 'fat-loss'
  | 'muscle'
  | 'strength'
  | 'endurance'
  | 'health'
  | 'longevity'

export type SessionBlueprint = {
  title: string
  focus: string
  patterns: ExercisePattern[]
  kind: 'strength' | 'cardio' | 'mobility' | 'conditioning' | 'recovery'
}

export interface PlanTemplate {
  id: string
  label: string
  description: string
  defaultDays: number
  maxDays: number
  sessionMinutes: number
  intensity: 'Low' | 'Moderate' | 'High'
  sessions: SessionBlueprint[]
  supportsCardio: boolean
}

export interface GeneratedExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  repetitions: string
  durationSeconds: number | null
  restSeconds: number
  instructions: string
  equipment: EquipmentTag[]
  primaryMuscle: string
}

export interface GeneratedDay {
  dayNumber: number
  dayName: string
  weekday: number
  workoutTitle: string
  focus: string
  muscleGroups: string[]
  estimatedDuration: number
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  kind: SessionBlueprint['kind'] | 'rest'
  exercises: GeneratedExercise[]
  recoveryNotes: string | null
}

export interface SafetySummary {
  restricted: boolean
  excludedPatterns: ExercisePattern[]
  excludedInjuries: InjurySite[]
  notes: string[]
  professionalReviewRecommended: boolean
  volumeCapApplied: boolean
}

export interface RecommendationDocument {
  recommendationId: string
  userId: string
  modelVersion: string
  modelSource: 'onnx-web'
  predictedPlanCategory: string
  planTemplateId: string
  planTitle: string
  fitnessGoal: FitnessGoal
  datasetGoal: DatasetGoal
  missionSnapshot: {
    answers: MissionAnswerMap
    profile: {
      age: number
      heightCm: number
      weightKg: number
      goal: FitnessGoal
      experience: ExperienceLevel
      workoutDays: number[]
    }
    capturedAt: string
    schemaVersion: number
  }
  schedule: GeneratedDay[]
  safety: SafetySummary
  createdAt: string
  updatedAt: string
  isActive: boolean
  isOutdated: boolean
  version: number
  generationStatus: 'ready' | 'superseded'
  inferenceMs: number
  confidence: number
  classProbabilities: Array<{ label: string; probability: number }>
}

export interface RecommendationState {
  status: 'idle' | 'loading' | 'generating' | 'ready' | 'error'
  readiness: RecommendationReadiness | null
  active: RecommendationDocument | null
  history: RecommendationDocument[]
  error: string | null
}

export interface RecommendationContext {
  profile: QuickStartProfile
  answers: MissionAnswerMap
  progress: Record<string, MissionProgress>
}
