import { create } from 'zustand'
import type { MissionAnswerMap, RecommendationDocument } from '../features/workout-recommendation/types'
import type { MissionProgress, QuickStartProfile } from '../types'
import {
  localRecommendationRepository,
  fetchRecommendations,
  persistRecommendation,
  deactivateRecommendations,
} from '../features/workout-recommendation/data/recommendationRepository'
import {
  createRecommendation,
  isPlanOutdated,
  RecommendationError,
} from '../features/workout-recommendation/lib/recommendationService'

interface RecommendationState {
  uid: string | null
  plans: RecommendationDocument[]
  hydrated: boolean
  loading: boolean
  generating: boolean
  error: string | null
  errorCode: string | null
  hydrate: (uid: string, cloudEnabled: boolean, answers: MissionAnswerMap) => Promise<void>
  generate: (args: {
    uid: string
    profile: QuickStartProfile
    answers: MissionAnswerMap
    progress: Record<string, MissionProgress>
    cloudEnabled: boolean
  }) => Promise<RecommendationDocument>
  syncOutdated: (uid: string, answers: MissionAnswerMap, cloudEnabled: boolean) => void
  clear: () => void
}

function sortPlans(plans: RecommendationDocument[]) {
  return [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function mergePlans(cloud: RecommendationDocument[], local: RecommendationDocument[]) {
  const byId = new Map<string, RecommendationDocument>()
  for (const plan of [...local, ...cloud]) byId.set(plan.recommendationId, plan)
  return sortPlans([...byId.values()])
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  uid: null,
  plans: [],
  hydrated: false,
  loading: false,
  generating: false,
  error: null,
  errorCode: null,

  hydrate: async (uid, cloudEnabled, answers) => {
    if (get().uid === uid && get().hydrated) return
    set({ uid, loading: true, error: null, errorCode: null })
    const local = localRecommendationRepository.getRecommendations(uid)
    let plans = sortPlans(local)
    let latestAnswers = answers

    if (cloudEnabled) {
      try {
        const cloud = await fetchRecommendations(uid)
        plans = mergePlans(cloud, local)
      } catch {
        // Offline or rules denied; local plans remain usable.
      }
    }

    // Refresh outdated flags against the latest persisted answers.
    const refreshed = plans.map((plan) => ({
      ...plan,
      isOutdated: isPlanOutdated(plan, latestAnswers),
    }))
    localRecommendationRepository.saveRecommendations(uid, refreshed)
    if (cloudEnabled) {
      const active = refreshed.find((plan) => plan.isActive)
      if (active) {
        persistRecommendation(uid, active).catch(() => undefined)
      }
    }
    set({ plans: refreshed, hydrated: true, loading: false })
  },

  generate: async ({ uid, profile, answers, progress, cloudEnabled }) => {
    if (get().generating) {
      throw new RecommendationError('not-ready', 'A plan is already being generated.')
    }
    set({ generating: true, error: null, errorCode: null })
    try {
      const previous = get().plans
      const plan = await createRecommendation({ userId: uid, profile, answers, progress, previousPlans: previous })
      const next = sortPlans([
        plan,
        ...previous.map((existing) => ({ ...existing, isActive: false })),
      ])

      if (cloudEnabled) {
        try {
          await deactivateRecommendations(uid, plan.recommendationId)
          await persistRecommendation(uid, plan)
        } catch (error) {
          throw new RecommendationError(
            'persistence-failed',
            'The plan was generated but could not be saved to your account. Try again.',
            [error instanceof Error ? error.message : ''],
          )
        }
      }

      localRecommendationRepository.saveRecommendations(uid, next)
      set({ plans: next, generating: false, hydrated: true })
      return plan
    } catch (error) {
      const code = error instanceof RecommendationError ? error.code : 'inference-failed'
      const message =
        error instanceof Error ? error.message : 'The workout plan could not be generated.'
      set({ generating: false, error: message, errorCode: code })
      throw error
    }
  },

  syncOutdated: (uid, answers, cloudEnabled) => {
    const current = get().plans
    if (current.length === 0) return
    let changed = false
    const next = current.map((plan) => {
      if (!plan.isActive) return plan
      const outdated = isPlanOutdated(plan, answers)
      if (outdated === plan.isOutdated) return plan
      changed = true
      const updated = { ...plan, isOutdated: outdated }
      if (cloudEnabled) persistRecommendation(uid, updated).catch(() => undefined)
      return updated
    })
    if (changed) {
      localRecommendationRepository.saveRecommendations(uid, next)
      set({ plans: next })
    }
  },

  clear: () =>
    set({
      uid: null,
      plans: [],
      hydrated: false,
      loading: false,
      generating: false,
      error: null,
      errorCode: null,
    }),
}))

export function selectActivePlan(plans: RecommendationDocument[]) {
  return plans.find((plan) => plan.isActive) ?? plans[0] ?? null
}
