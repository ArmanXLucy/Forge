import { useEffect, useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useProfileStore } from '../../../store/useProfileStore'
import {
  selectActivePlan,
  useRecommendationStore,
} from '../../../store/useRecommendationStore'
import { evaluateReadiness } from '../lib/modelInput'
import { isPlanOutdated } from '../lib/recommendationService'
import type { RecommendationReadiness } from '../types'

export function useWorkoutRecommendation() {
  const { user } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const answers = useProfileStore((s) => s.answers)
  const progress = useProfileStore((s) => s.progress)
  const cloudEnabled = useProfileStore((s) => s.cloudEnabled)
  const uid = useProfileStore((s) => s.uid) ?? user?.uid ?? null

  const plans = useRecommendationStore((s) => s.plans)
  const hydrated = useRecommendationStore((s) => s.hydrated)
  const loading = useRecommendationStore((s) => s.loading)
  const generating = useRecommendationStore((s) => s.generating)
  const error = useRecommendationStore((s) => s.error)
  const errorCode = useRecommendationStore((s) => s.errorCode)
  const hydrate = useRecommendationStore((s) => s.hydrate)
  const generate = useRecommendationStore((s) => s.generate)
  const syncOutdated = useRecommendationStore((s) => s.syncOutdated)

  const readiness: RecommendationReadiness = useMemo(
    () => evaluateReadiness(profile, answers, progress),
    [profile, answers, progress],
  )

  const active = selectActivePlan(plans)
  const outdated = Boolean(active && isPlanOutdated(active, answers))

  useEffect(() => {
    if (!uid) return
    void hydrate(uid, cloudEnabled, answers)
    // Answers intentionally excluded: hydration is per account, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, cloudEnabled, hydrate])

  useEffect(() => {
    if (!uid || !hydrated) return
    syncOutdated(uid, answers, cloudEnabled)
  }, [uid, hydrated, answers, cloudEnabled, syncOutdated])

  return {
    uid,
    profile,
    answers,
    progress,
    readiness,
    plans,
    active,
    outdated,
    hydrated,
    loading,
    generating,
    error,
    errorCode,
    cloudEnabled,
    generate: () => {
      if (!uid || !profile) {
        return Promise.reject(new Error('Sign in and complete your Quick Start profile first.'))
      }
      return generate({ uid, profile, answers, progress, cloudEnabled })
    },
  }
}
