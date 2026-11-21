import { describe, expect, it } from 'vitest'
import type { QuickStartProfile } from '../../../types'
import { PLAN_CATEGORY_MAP } from '../data/planCatalog'
import { EXERCISE_MAP } from '../data/exerciseLibrary'
import { generateWorkoutPlan } from '../lib/generator'
import { validatePlan } from '../lib/planValidator'
import { authoritativeAnswers, isPlanOutdated } from '../lib/recommendationService'
import { completeAnswers } from './modelInput.test'
import type { MissionAnswerMap } from '../types'

const profile: QuickStartProfile = {
  name: 'Generator Test',
  age: 34,
  heightCm: 175,
  weightKg: 82,
  goal: 'build-muscle',
  experience: 'intermediate',
  workoutDays: [1, 3, 5],
  completedAt: '2026-01-01T00:00:00.000Z',
}

function planFor(category: string, overrides: Partial<QuickStartProfile> = {}, answers?: MissionAnswerMap) {
  return generateWorkoutPlan({
    userId: 'user-test',
    profile: { ...profile, ...overrides },
    answers: answers ?? completeAnswers(),
    predictedCategory: category,
    classProbabilities: [{ label: category, probability: 0.9 }],
    confidence: 0.9,
    modelVersion: '1.0.0',
    inferenceMs: 4,
    now: new Date('2026-02-01T10:00:00.000Z'),
    recommendationId: `rec-${category.replace(/\W+/g, '-')}`,
  })
}

describe('weekly generation for every plan category', () => {
  for (const category of Object.keys(PLAN_CATEGORY_MAP)) {
    it(`produces a valid seven-day plan for ${category}`, () => {
      const plan = planFor(category)
      expect(plan.schedule).toHaveLength(7)
      expect(plan.schedule.filter((day) => day.kind === 'rest').length).toBeGreaterThanOrEqual(1)
      expect(plan.schedule.map((day) => day.weekday).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
      expect(validatePlan(plan, { injurySites: [], allowedEquipment: ['gym', 'dumbbells', 'bodyweight', 'cardio', 'mat'] })).toEqual([])
      expect(plan.predictedPlanCategory).toBe(category)
      expect(plan.modelSource).toBe('onnx-web')
      expect(plan.classProbabilities.length).toBeGreaterThan(0)
    })
  }
})

describe('personalisation and constraints', () => {
  it('caps sessions for limited weekly time', () => {
    const answers = completeAnswers({
      'mindset-mission': { weeklyTime: '2h', coachingStyle: 'balanced', habit: 'Walk', confidence: 5 },
    })
    const plan = planFor('Push-Pull-Legs Split (Hypertrophy)', { workoutDays: [1, 2, 3, 4, 5] }, answers)
    const trainingDays = plan.schedule.filter((day) => day.kind !== 'rest')
    expect(trainingDays.length).toBeLessThanOrEqual(2)
  })

  it('uses the user preferred training days when available', () => {
    const plan = planFor('5x5 Compound Lifts', { workoutDays: [2, 4, 6] })
    const trainingWeekdays = plan.schedule
      .filter((day) => day.kind !== 'rest')
      .map((day) => day.weekday)
      .sort()
    expect(trainingWeekdays).toEqual([2, 4, 6])
  })

  it('never prescribes a movement excluded by a knee or shoulder injury', () => {
    const answers = completeAnswers({
      'health-profile': {
        conditions: ['none'],
        injuries: 'ACL reconstructed knee, shoulder impingement',
        restrictions: '',
        clearance: 'cleared',
        emergencyConsent: true,
      },
    })
    const plan = planFor('HIIT with Dumbbells', { experience: 'advanced' }, answers)
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        const definition = EXERCISE_MAP[exercise.exerciseId]
        expect(definition).toBeTruthy()
        expect(definition.injuryExclusions).not.toContain('Knee')
        expect(definition.injuryExclusions).not.toContain('Shoulder')
      }
    }
  })

  it('never requires equipment the user does not have', () => {
    const answers = completeAnswers({
      'training-history': { experience: 'beginner', equipment: ['none'] },
    })
    const plan = planFor('Bodyweight Circuit', { experience: 'beginner' }, answers)
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        const definition = EXERCISE_MAP[exercise.exerciseId]
        expect(definition.equipment.some((tag) => tag === 'bodyweight' || tag === 'mat')).toBe(true)
      }
    }
  })

  it('removes high-impact work when clearance is pending', () => {
    const answers = completeAnswers({
      'health-profile': {
        conditions: ['none'],
        injuries: 'Shoulder impingement',
        restrictions: '',
        clearance: 'pending',
        emergencyConsent: true,
      },
    })
    const plan = planFor('Olympic Lifting & Plyometrics', { experience: 'advanced' }, answers)
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        expect(EXERCISE_MAP[exercise.exerciseId].impact).toBe('low')
      }
    }
    expect(plan.safety.professionalReviewRecommended).toBe(true)
  })

  it('builds a usable plan for yoga-mat-only equipment', () => {
    const answers = completeAnswers({
      'training-history': { experience: 'beginner', equipment: ['none'] },
    })
    const plan = planFor('Yoga & Mobility Flow', { experience: 'beginner', workoutDays: [] }, answers)
    expect(plan.schedule.filter((day) => day.kind !== 'rest').length).toBeGreaterThanOrEqual(2)
  })

  it('increments plan version and keeps prior plans', () => {
    const first = planFor('Bodyweight Circuit')
    const second = generateWorkoutPlan({
      userId: 'user-test',
      profile,
      answers: completeAnswers(),
      predictedCategory: 'Bodyweight Circuit',
      classProbabilities: [{ label: 'Bodyweight Circuit', probability: 0.8 }],
      confidence: 0.8,
      modelVersion: '1.0.0',
      inferenceMs: 3,
      previousPlans: [first],
    })
    expect(second.version).toBe(2)
    expect(first.version).toBe(1)
  })

  it('marks a plan outdated only when relevant answers change', () => {
    const plan = planFor('Bodyweight Circuit')
    const unchanged = completeAnswers({ 'nutrition-profile': { diet: 'vegan' } })
    expect(isPlanOutdated(plan, unchanged)).toBe(false)
    const changed = completeAnswers({
      'body-metrics': { weight: 90, gender: 'male' },
    })
    expect(isPlanOutdated(plan, changed)).toBe(true)
  })

  it('stores only the authoritative answer subset in the snapshot', () => {
    const plan = planFor('Bodyweight Circuit')
    const snapshot = authoritativeAnswers(plan.missionSnapshot.answers)
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        'body-metrics',
        'goal-deep-dive',
        'health-profile',
        'lifestyle-check',
        'mindset-mission',
        'training-history',
      ].sort(),
    )
    expect(snapshot['nutrition-profile']).toBeUndefined()
  })
})
