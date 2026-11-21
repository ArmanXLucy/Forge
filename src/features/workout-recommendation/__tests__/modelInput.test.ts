import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MissionAnswerMap } from '../types'
import type { MissionProgress, QuickStartProfile } from '../../../types'
import {
  buildModelInput,
  deriveInjurySites,
  evaluateReadiness,
} from '../lib/modelInput'
import { PLAN_CATEGORY_MAP } from '../data/planCatalog'

const profile: QuickStartProfile = {
  name: 'Test Athlete',
  age: 31,
  heightCm: 178,
  weightKg: 78,
  goal: 'build-muscle',
  experience: 'intermediate',
  workoutDays: [1, 3, 5],
  completedAt: '2026-01-01T00:00:00.000Z',
}

export function completeAnswers(overrides: MissionAnswerMap = {}): MissionAnswerMap {
  const base: MissionAnswerMap = {
    'body-metrics': { weight: 78, gender: 'male', restingHr: 60 },
    'health-profile': {
      conditions: ['none'],
      injuries: '',
      restrictions: '',
      clearance: 'cleared',
      emergencyConsent: true,
    },
    'training-history': {
      experience: 'intermediate',
      equipment: ['gym'],
      preferences: ['free-weights'],
    },
    'nutrition-profile': { diet: 'omnivore' },
    'lifestyle-check': { sleepHours: 7.5, dailyActivity: 'moderate', stress: 4 },
    'goal-deep-dive': {
      primaryGoal: 'muscle',
      timeline: '12-weeks',
      motivation: 'Get stronger',
      secondaryGoals: ['confidence'],
    },
    'mindset-mission': {
      confidence: 7,
      coachingStyle: 'balanced',
      habit: 'Prepare lunch',
      weeklyTime: '5-6h',
    },
  }
  return { ...base, ...overrides }
}

export function completeProgress(): Record<string, MissionProgress> {
  return Object.fromEntries(
    Object.keys(completeAnswers()).map((missionId) => [
      missionId,
      { missionId, status: 'completed' as const, completedAt: '2026-01-01T00:00:00.000Z' },
    ]),
  )
}

describe('mission readiness', () => {
  it('locks with zero completed missions', () => {
    const result = evaluateReadiness(profile, {}, {})
    expect(result.ready).toBe(false)
    expect(result.completedMissions).toBe(0)
    expect(result.remainingMissionIds).toHaveLength(7)
  })

  it('locks with partially completed missions', () => {
    const progress = completeProgress()
    delete progress['health-profile']
    const result = evaluateReadiness(profile, completeAnswers(), progress)
    expect(result.ready).toBe(false)
    expect(result.remainingMissionIds).toEqual(['health-profile'])
  })

  it('unlocks with all missions completed and valid answers', () => {
    const result = evaluateReadiness(profile, completeAnswers(), completeProgress())
    expect(result.ready).toBe(true)
    expect(result.completedMissions).toBe(7)
    expect(result.invalidFields).toEqual([])
  })

  it('locks when a completed mission has no persisted answers', () => {
    const answers = completeAnswers()
    delete answers['goal-deep-dive']
    const result = evaluateReadiness(profile, answers, completeProgress())
    expect(result.ready).toBe(false)
    expect(result.missingAnswerMissions).toEqual(['goal-deep-dive'])
  })

  it('locks when required answers are invalid', () => {
    const answers = completeAnswers()
    answers['body-metrics'] = { weight: 8, gender: 'male' }
    const result = evaluateReadiness(profile, answers, completeProgress())
    expect(result.ready).toBe(false)
    expect(result.invalidFields).toContain('body-metrics.weight')
  })

  it('does not unlock from a completion badge alone', () => {
    const result = evaluateReadiness(profile, {}, completeProgress())
    expect(result.ready).toBe(false)
    expect(result.missingAnswerMissions).toHaveLength(7)
  })
})

describe('model input mapping', () => {
  it('maps mission answers to the exact model contract', () => {
    const result = buildModelInput(profile, completeAnswers())
    expect(result.input).toMatchObject({
      Age: 31,
      Gender: 'Male',
      Weight_kg: 78,
      Height_cm: 178,
      Goal: 'Muscle Gain',
      Equipment: 'Gym Membership',
      Experience: 'Intermediate',
      Injury: 'None',
    })
  })

  it('derives limited injury categories and never sends free text', () => {
    const answers = completeAnswers({
      'health-profile': {
        conditions: ['joint'],
        injuries: 'Left knee meniscus issue and old shoulder impingement',
        restrictions: 'Avoid deep knee flexion',
        clearance: 'cleared',
        emergencyConsent: true,
      },
    })
    const result = buildModelInput(profile, answers)
    expect(result.injurySites).toEqual(['Knee', 'Shoulder'])
    expect(result.input.Injury).toBe('Knee')
    expect(JSON.stringify(result.input)).not.toContain('meniscus')
    expect(result.professionalReviewRecommended).toBe(true)
  })

  it('maps equipment and goals from the mission vocabulary', () => {
    const answers = completeAnswers({
      'training-history': { experience: 'beginner', equipment: ['none'] },
      'goal-deep-dive': { primaryGoal: 'fat-loss', timeline: '8-weeks', motivation: 'Health' },
    })
    const result = buildModelInput(profile, answers)
    expect(result.input.Equipment).toBe('Bodyweight Only')
    expect(result.input.Goal).toBe('Weight Loss')
    expect(result.input.Experience).toBe('Beginner')
  })

  it('recognises none and empty injury text', () => {
    expect(deriveInjurySites({ injuries: 'None', restrictions: '' })).toEqual([])
  })
})

describe('plan catalog coverage', () => {
  it('covers every class exported by the trained model', () => {
    const schema = JSON.parse(
      readFileSync(resolve(process.cwd(), 'workout-recommendation/artifacts/feature_schema.json'), 'utf8'),
    ) as { target_labels: string[] }
    expect(schema.target_labels).toHaveLength(24)
    for (const label of schema.target_labels) {
      expect(PLAN_CATEGORY_MAP[label], label).toBeTruthy()
    }
    expect(Object.keys(PLAN_CATEGORY_MAP)).toHaveLength(24)
  })
})
