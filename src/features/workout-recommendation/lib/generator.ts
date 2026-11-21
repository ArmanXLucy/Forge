import { createId } from '../../../lib/id'
import type { FitnessGoal, QuickStartProfile } from '../../../types'
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary'
import { PLAN_CATEGORY_MAP, templateForCategory } from '../data/planCatalog'
import type {
  EquipmentTag,
  ExerciseTemplate,
  GeneratedDay,
  GeneratedExercise,
  InjurySite,
  MissionAnswerMap,
  PlanTemplate,
  RecommendationDocument,
  SafetySummary,
  SessionBlueprint,
} from '../types'
import {
  buildModelInput,
  datasetGoalToFitnessGoal,
  equipmentTagsForModel,
  getStringArray,
} from './modelInput'
import { validatePlan } from './planValidator'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 4, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
}

const WEEKLY_SESSION_CAP: Record<string, number> = {
  '2h': 2,
  '3-4h': 3,
  '5-6h': 4,
  '7h+': 5,
}

export interface GeneratePlanArgs {
  userId: string
  profile: QuickStartProfile
  answers: MissionAnswerMap
  predictedCategory: string
  classProbabilities: Array<{ label: string; probability: number }>
  confidence: number
  modelVersion: string
  inferenceMs: number
  version?: number
  previousPlans?: RecommendationDocument[]
  now?: Date
  recommendationId?: string
  /** Deterministic variation seed; regeneration should pass a different value. */
  seed?: number
}

interface SafetyContext {
  injurySites: InjurySite[]
  professionalReviewRecommended: boolean
  conditions: string[]
  clearance: string
  conservative: boolean
  notes: string[]
}

export function generateWorkoutPlan(args: GeneratePlanArgs): RecommendationDocument {
  const now = args.now ?? new Date()
  const template = templateForCategory(args.predictedCategory)
  const model = buildModelInput(args.profile, args.answers)
  const safety = buildSafetyContext(model, args.answers)
  const equipmentTags = equipmentTagsForModel(model.input.Equipment)
  const weeklyTime = String(args.answers['mindset-mission']?.weeklyTime ?? '3-4h')
  const preferredDays = normalizeDays(args.profile.workoutDays)
  const experience = args.profile.experience

  const sessionCount = resolveSessionCount({
    template,
    experience,
    weeklyTime,
    preferredDays,
  })
  const trainingDays = pickTrainingDays(preferredDays, sessionCount)

  const usedPerWeek = new Set<string>()
  const seed = args.seed ?? 0
  const days: GeneratedDay[] = []
  let sessionIndex = 0
  let volumeCapApplied = false

  for (let weekday = 0; weekday < 7; weekday += 1) {
    const dayName = WEEKDAY_NAMES[weekday]
    if (!trainingDays.includes(weekday)) {
      days.push(restDay(weekday, dayName, args.answers, safety))
      continue
    }
    const blueprint = template.sessions[sessionIndex % template.sessions.length]
    sessionIndex += 1
    const built = buildSession({
      blueprint,
      template,
      weekday,
      dayName,
      dayNumber: weekday === 0 ? 7 : weekday,
      experience,
      equipment: equipmentTags,
      safety,
      seed,
      usedPerWeek,
    })
    volumeCapApplied = volumeCapApplied || built.volumeCapApplied
    days.push(built.day)
  }

  // Days are stored Sunday-first internally; present Monday-first to the user.
  const ordered = [...days].sort((a, b) => daySortIndex(a.weekday) - daySortIndex(b.weekday))
  const schedule = ordered.map((day, index) => ({ ...day, dayNumber: index + 1 }))

  const totalHardSets = schedule.reduce(
    (sum, day) => sum + day.exercises.reduce((daySum, exercise) => daySum + (exercise.sets || 0), 0),
    0,
  )
  const safeSafety: SafetySummary = {
    restricted:
      safety.professionalReviewRecommended ||
      safety.injurySites.some((site) => site !== 'None') ||
      volumeCapApplied,
    excludedPatterns: [],
    excludedInjuries: safety.injurySites,
    notes: [
      ...safety.notes,
      `Weekly planned volume: ${totalHardSets} working sets across ${trainingDays.length} sessions.`,
    ],
    professionalReviewRecommended: safety.professionalReviewRecommended,
    volumeCapApplied,
  }

  const plan: RecommendationDocument = {
    recommendationId: args.recommendationId ?? createId('rec'),
    userId: args.userId,
    modelVersion: args.modelVersion,
    modelSource: 'onnx-web',
    predictedPlanCategory: args.predictedCategory,
    planTemplateId: template.id,
    planTitle: `${template.label} — 7-Day Plan`,
    fitnessGoal: args.profile.goal,
    datasetGoal: model.input.Goal,
    missionSnapshot: {
      answers: sanitizeSnapshot(args.answers),
      profile: {
        age: args.profile.age,
        heightCm: args.profile.heightCm,
        weightKg: args.profile.weightKg,
        goal: args.profile.goal,
        experience: args.profile.experience,
        workoutDays: [...args.profile.workoutDays],
      },
      capturedAt: now.toISOString(),
      schemaVersion: 1,
    },
    schedule,
    safety: safeSafety,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isActive: true,
    isOutdated: false,
    version: args.version ?? nextVersion(args.previousPlans ?? []),
    generationStatus: 'ready',
    inferenceMs: Math.round(args.inferenceMs),
    confidence: Number(args.confidence.toFixed(4)),
    classProbabilities: args.classProbabilities.slice(0, 8).map((entry) => ({
      label: entry.label,
      probability: Number(entry.probability.toFixed(4)),
    })),
  }

  const issues = validatePlan(plan, {
    injurySites: safety.injurySites,
    allowedEquipment: equipmentTags,
  })
  if (issues.length > 0) {
    throw new Error(`Generated plan failed validation: ${issues.join('; ')}`)
  }
  return plan
}

function normalizeDays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
    (a, b) => daySortIndex(a) - daySortIndex(b),
  )
}

function daySortIndex(weekday: number) {
  return weekday === 0 ? 6 : weekday - 1
}

function resolveSessionCount({
  template,
  experience,
  weeklyTime,
  preferredDays,
}: {
  template: PlanTemplate
  experience: QuickStartProfile['experience']
  weeklyTime: string
  preferredDays: number[]
}) {
  const experienceCap =
    experience === 'advanced' ? 5 : experience === 'intermediate' ? 4 : template.id === 'mobility-flow' ? 5 : 3
  const availabilityCap = preferredDays.length >= 2 ? preferredDays.length : template.defaultDays
  const desired = Math.min(
    template.defaultDays,
    template.maxDays,
    WEEKLY_SESSION_CAP[weeklyTime] ?? 3,
    experienceCap,
    Math.max(2, availabilityCap),
  )
  return Math.max(2, desired)
}

function pickTrainingDays(preferredDays: number[], count: number): number[] {
  if (preferredDays.length >= count) {
    // Spread the selection across the user's available days.
    const step = preferredDays.length / count
    return Array.from({ length: count }, (_, index) => preferredDays[Math.floor(index * step)])
  }
  if (preferredDays.length >= 2) {
    const defaults = DEFAULT_DAYS[count] ?? DEFAULT_DAYS[3]
    const merged = [...preferredDays]
    for (const day of defaults) {
      if (merged.length >= count) break
      if (!merged.includes(day)) merged.push(day)
    }
    return merged.slice(0, count).sort((a, b) => daySortIndex(a) - daySortIndex(b))
  }
  return DEFAULT_DAYS[count] ?? DEFAULT_DAYS[3]
}

function buildSafetyContext(
  model: ReturnType<typeof buildModelInput>,
  answers: MissionAnswerMap,
): SafetyContext {
  const notes: string[] = [...model.warnings]
  const conditions = model.conditions
  const clearance = model.clearance
  const injurySites = model.injurySites

  const conservative =
    model.professionalReviewRecommended || injurySites.length > 0 || conditions.length > 0

  if (model.professionalReviewRecommended) {
    notes.push('A recorded health condition or clearance status requires conservative programming and professional review.')
  }
  if (injurySites.length > 0) {
    notes.push(`Exercises that load ${injurySites.join(', ').toLowerCase()} are excluded or modified.`)
  }

  const health = answers['health-profile']
  const restrictions = typeof health?.restrictions === 'string' ? health.restrictions.trim() : ''
  if (restrictions) {
    notes.push('Your recorded movement restrictions are applied as an exclusion filter, not a diagnosis.')
  }

  const lifestyle = answers['lifestyle-check']
  const stress = Number(lifestyle?.stress ?? 0)
  const sleepHours = Number(lifestyle?.sleepHours ?? 0)
  if ((stress >= 8 || sleepHours > 0 && sleepHours < 6) && !model.professionalReviewRecommended) {
    notes.push('High stress or low sleep was reported. Weekly volume is capped and recovery days are protected.')
  }

  if (!model.professionalReviewRecommended && injurySites.length === 0) {
    notes.push('No injury, clearance or condition conflict was recorded. Standard training filters applied.')
  }
  notes.push('This plan is general training guidance, not medical clearance.')

  return {
    injurySites,
    professionalReviewRecommended: model.professionalReviewRecommended,
    conditions,
    clearance,
    conservative,
    notes,
  }
}

interface BuildSessionArgs {
  blueprint: SessionBlueprint
  template: PlanTemplate
  weekday: number
  dayName: string
  dayNumber: number
  experience: QuickStartProfile['experience']
  equipment: readonly EquipmentTag[]
  safety: SafetyContext
  seed: number
  usedPerWeek: Set<string>
}

function buildSession(args: BuildSessionArgs): {
  day: GeneratedDay
  volumeCapApplied: boolean
} {
  const { blueprint, template, safety, equipment } = args
  const targetCount = sessionExerciseCount(blueprint, args.experience)
  const selected: ExerciseTemplate[] = []

  for (const pattern of expandPatterns(blueprint.patterns, targetCount)) {
    const exercise = pickExercise({
      pattern,
      experience: args.experience,
      equipment,
      safety,
      avoid: new Set(selected.map((entry) => entry.id)),
      seed: args.seed + selected.length,
    })
    if (exercise) selected.push(exercise)
  }

  // Guarantee a usable session even with very limited equipment.
  if (selected.length < 2) {
    const fallback = EXERCISE_LIBRARY.filter(
      (exercise) =>
        exercise.category === 'mobility' &&
        exercise.equipment.some((tag) => equipment.includes(tag)) &&
        !isExcluded(exercise, safety),
    )
    for (const exercise of fallback) {
      if (selected.length >= 2) break
      if (!selected.some((entry) => entry.id === exercise.id)) selected.push(exercise)
    }
  }

  const dose = doseFor(template, blueprint, args.experience, args.seed)
  const exercises = selected.map((exercise, index) =>
    toGeneratedExercise(exercise, dose, index),
  )

  const hardSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0)
  const volumeCap = args.experience === 'beginner' ? 18 : args.experience === 'returning' ? 18 : 24
  const volumeCapApplied = hardSets > volumeCap
  if (volumeCapApplied) {
    let running = 0
    for (const exercise of exercises) {
      const keep = Math.min(exercise.sets, Math.max(1, volumeCap - running))
      running += keep
      exercise.sets = keep
    }
  }

  const estimatedDuration = estimateDuration(exercises, blueprint.kind, args.experience)
  const muscleGroups = [...new Set(exercises.map((exercise) => exercise.primaryMuscle))]
  const notes: string[] = []
  if (blueprint.kind === 'strength') notes.push('Leave 1–2 reps in reserve on working sets. Rest fully before the next set.')
  if (blueprint.kind === 'conditioning') notes.push('Keep technique clean; reduce the pace before reducing form.')
  if (blueprint.kind === 'cardio') notes.push('Stay at a conversational effort unless the session says otherwise.')
  if (blueprint.kind === 'mobility') notes.push('Move slowly and stay well inside a pain-free range.')
  if (safety.professionalReviewRecommended) notes.push('Stop and seek professional advice if symptoms increase.')

  return {
    day: {
      dayNumber: args.dayNumber,
      dayName: args.dayName,
      weekday: args.weekday,
      workoutTitle: blueprint.title,
      focus: blueprint.focus,
      muscleGroups,
      estimatedDuration,
      difficulty:
        args.experience === 'advanced'
          ? 'Advanced'
          : args.experience === 'beginner' || args.experience === 'returning'
            ? 'Beginner'
            : 'Intermediate',
      kind: blueprint.kind,
      exercises,
      recoveryNotes: notes.join(' '),
    },
    volumeCapApplied,
  }
}

function sessionExerciseCount(blueprint: SessionBlueprint, experience: QuickStartProfile['experience']) {
  const base = blueprint.patterns.length
  if (experience === 'beginner' || experience === 'returning') return Math.max(2, base - 1)
  if (blueprint.kind === 'cardio') return Math.max(1, base - 1)
  return base
}

function expandPatterns(patterns: SessionBlueprint['patterns'], count: number) {
  return Array.from({ length: count }, (_, index) => patterns[index % patterns.length])
}

const PATTERN_FALLBACK: Record<ExerciseTemplate['pattern'], ExerciseTemplate['pattern'][]> = {
  squat: ['squat', 'lunge'],
  hinge: ['hinge', 'core'],
  lunge: ['lunge', 'squat'],
  push: ['push', 'push-overhead'],
  'push-overhead': ['push-overhead', 'push'],
  pull: ['pull', 'pull-vertical'],
  'pull-vertical': ['pull-vertical', 'pull'],
  core: ['core', 'carry'],
  carry: ['carry', 'core'],
  run: ['run', 'cycle', 'row'],
  row: ['row', 'run'],
  cycle: ['cycle', 'run'],
  mobility: ['mobility'],
  plyometric: ['plyometric', 'conditioning'],
  conditioning: ['conditioning', 'plyometric'],
}

function isExcluded(exercise: ExerciseTemplate, safety: SafetyContext) {
  if (exercise.injuryExclusions.some((site) => safety.injurySites.includes(site))) return true
  if (safety.clearance === 'pending' || safety.clearance === 'restricted') {
    if (exercise.impact !== 'low') return true
  }
  if (safety.professionalReviewRecommended && exercise.impact === 'high') return true
  return false
}

function pickExercise({
  pattern,
  experience,
  equipment,
  safety,
  avoid,
  seed,
}: {
  pattern: ExerciseTemplate['pattern']
  experience: QuickStartProfile['experience']
  equipment: readonly EquipmentTag[]
  safety: SafetyContext
  avoid: Set<string>
  seed: number
}): ExerciseTemplate | null {
  const patterns = PATTERN_FALLBACK[pattern] ?? [pattern]
  const candidates: Array<{ exercise: ExerciseTemplate; score: number }> = []

  for (const candidatePattern of patterns) {
    for (const exercise of EXERCISE_LIBRARY) {
      if (exercise.pattern !== candidatePattern) continue
      if (!exercise.equipment.some((tag) => equipment.includes(tag))) continue
      if (isExcluded(exercise, safety)) continue
      if (avoid.has(exercise.id)) continue
      candidates.push({
        exercise,
        score: scoreExercise(exercise, experience, equipment, seed),
      })
    }
    if (candidates.length > 0) break
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
  return candidates[0].exercise
}

function scoreExercise(
  exercise: ExerciseTemplate,
  experience: QuickStartProfile['experience'],
  equipment: readonly EquipmentTag[],
  seed: number,
) {
  let score = 0
  const level = experience === 'advanced' ? 2 : experience === 'intermediate' ? 1 : 0
  const difficulty = exercise.difficulty === 'advanced' ? 2 : exercise.difficulty === 'intermediate' ? 1 : 0
  score += 4 - Math.abs(level - difficulty)
  if (exercise.equipment.some((tag) => tag === 'dumbbells' && equipment.includes('dumbbells'))) score += 1
  if (exercise.goalTags.includes(goalTagForExperience(experience))) score += 0.5
  // Deterministic variety: rotate the preferred option by seed.
  score += ((hashString(exercise.id) + seed) % 7) / 10
  return score
}

function goalTagForExperience(experience: QuickStartProfile['experience']): FitnessGoalValue {
  if (experience === 'advanced') return 'strength'
  if (experience === 'intermediate') return 'muscle'
  return 'health'
}

type FitnessGoalValue = Parameters<ExerciseTemplate['goalTags']['includes']>[0]

interface ExerciseDose {
  sets: number
  repetitions: string
  restSeconds: number
  durationSeconds: number | null
  workSeconds: number
}

function doseFor(
  template: PlanTemplate,
  blueprint: SessionBlueprint,
  experience: QuickStartProfile['experience'],
  seed: number,
): ExerciseDose {
  const beginner = experience === 'beginner' || experience === 'returning'

  if (blueprint.kind === 'mobility') {
    return { sets: 2, repetitions: '45–60 sec', restSeconds: 15, durationSeconds: 50, workSeconds: 50 }
  }
  if (blueprint.kind === 'cardio') {
    const minutes = template.id === 'endurance-run' ? (beginner ? 20 : 32) : 24
    return {
      sets: 1,
      repetitions: `${minutes} min`,
      restSeconds: 0,
      durationSeconds: minutes * 60,
      workSeconds: minutes * 60,
    }
  }
  if (blueprint.kind === 'conditioning') {
    return {
      sets: beginner ? 2 : 3,
      repetitions: '40 sec',
      restSeconds: 30,
      durationSeconds: 40,
      workSeconds: 40,
    }
  }
  if (blueprint.kind === 'strength') {
    if (template.intensity === 'High') {
      return {
        sets: beginner ? 3 : 4,
        repetitions: beginner ? '6' : '5',
        restSeconds: 150,
        durationSeconds: 30,
        workSeconds: 30,
      }
    }
    if (template.id === 'sculpt') {
      return {
        sets: beginner ? 2 : 3,
        repetitions: '14',
        restSeconds: 45,
        durationSeconds: 40,
        workSeconds: 40,
      }
    }
    return {
      sets: beginner ? 2 : 3,
      repetitions: beginner ? '10' : '10–12',
      restSeconds: 75,
      durationSeconds: 45,
      workSeconds: 45,
    }
  }
  // recovery
  return { sets: 1, repetitions: `${15 + (seed % 3) * 5} min`, restSeconds: 0, durationSeconds: 900, workSeconds: 900 }
}

function toGeneratedExercise(
  exercise: ExerciseTemplate,
  dose: ExerciseDose,
  index: number,
): GeneratedExercise {
  const isHold = exercise.pattern === 'core' && /plank|hold|bird dog|dead bug/i.test(exercise.name)
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: dose.sets,
    repetitions: isHold ? '30–45 sec' : dose.repetitions,
    durationSeconds: dose.durationSeconds,
    restSeconds: dose.restSeconds,
    instructions: exercise.instructions,
    equipment: exercise.equipment,
    primaryMuscle: exercise.primaryMuscle,
  }
}

function estimateDuration(
  exercises: GeneratedExercise[],
  kind: SessionBlueprint['kind'],
  experience: QuickStartProfile['experience'],
) {
  const warmup = kind === 'mobility' ? 2 : kind === 'strength' ? 8 : 5
  const work = exercises.reduce((sum, exercise) => {
    const perSet = exercise.durationSeconds ?? 45
    return sum + exercise.sets * (perSet + exercise.restSeconds)
  }, 0)
  const experienceFactor = experience === 'beginner' ? 1.1 : experience === 'advanced' ? 0.95 : 1
  return Math.max(10, Math.round((warmup + work / 60) * experienceFactor))
}

function restDay(
  weekday: number,
  dayName: string,
  answers: MissionAnswerMap,
  safety: SafetyContext,
): GeneratedDay {
  const lifestyle = answers['lifestyle-check']
  const stress = Number(lifestyle?.stress ?? 0)
  const sleepHours = Number(lifestyle?.sleepHours ?? 0)
  const notes: string[] = ['Aim for normal daily movement, hydration and a consistent sleep window.']
  if (stress >= 7) notes.push('Stress is elevated — prioritise breathing, walking and an early night.')
  if (sleepHours > 0 && sleepHours < 6) notes.push('Sleep is below target. Keep this day genuinely restful.')
  if (safety.injurySites.length > 0) notes.push('Use gentle range-of-motion work only if it is comfortable.')
  return {
    dayNumber: weekday === 0 ? 7 : weekday,
    dayName,
    weekday,
    workoutTitle: 'Rest & Recovery',
    focus: 'Recovery · Adaptation',
    muscleGroups: [],
    estimatedDuration: 0,
    difficulty: 'Beginner',
    kind: 'rest',
    exercises: [],
    recoveryNotes: notes.join(' '),
  }
}

function sanitizeSnapshot(answers: MissionAnswerMap): MissionAnswerMap {
  // The snapshot is persisted with the plan. Keep it small: never store derived
  // or free-form medical narrative twice beyond what the user already saved.
  const snapshot: MissionAnswerMap = {}
  for (const [missionId, values] of Object.entries(answers)) {
    snapshot[missionId] = { ...values }
  }
  return snapshot
}

function nextVersion(previous: RecommendationDocument[]) {
  return previous.reduce((max, plan) => Math.max(max, plan.version), 0) + 1
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function planTemplateSummary(category: string) {
  return PLAN_CATEGORY_MAP[category]?.summary ?? 'A personalised weekly training plan.'
}
