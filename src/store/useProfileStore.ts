import { create } from 'zustand'
import type { MissionProgress, QuickStartProfile } from '../types'
import {
  calculateProfileCompletion,
  calculateXp,
  initialMissionProgress,
  localProfileRepository,
} from '../services/profileService'

interface ProfileState {
  uid: string | null
  profile: QuickStartProfile | null
  progress: Record<string, MissionProgress>
  hydrated: boolean
  hydrate: (uid: string) => void
  clear: () => void
  saveQuickStart: (profile: QuickStartProfile) => void
  startMission: (missionId: string) => void
  completeMission: (missionId: string) => void
  resetMission: (missionId: string) => void
  setMissionFieldProgress: (missionId: string, answeredFields: number, totalFields: number) => void
  resetAllData: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  uid: null,
  profile: null,
  progress: {},
  hydrated: false,

  hydrate: (uid) => {
    const profile = localProfileRepository.getQuickStart(uid)
    const saved = localProfileRepository.getMissionProgress(uid)
    const progress = { ...initialMissionProgress(), ...saved }
    set({ uid, profile, progress, hydrated: true })
  },

  clear: () => set({ uid: null, profile: null, progress: {}, hydrated: false }),

  saveQuickStart: (profile) => {
    const { uid, progress } = get()
    if (!uid) return
    localProfileRepository.saveQuickStart(uid, profile)
    const seeded = Object.keys(progress).length ? progress : initialMissionProgress()
    localProfileRepository.saveMissionProgress(uid, seeded)
    set({ profile, progress: seeded })
  },

  startMission: (missionId) => {
    const { uid, progress } = get()
    if (!uid) return
    const current = progress[missionId]
    if (current?.status === 'completed') return
    const next: Record<string, MissionProgress> = {
      ...progress,
      [missionId]: {
        ...current,
        missionId,
        status: 'in_progress',
        startedAt: current?.startedAt ?? new Date().toISOString(),
      },
    }
    localProfileRepository.saveMissionProgress(uid, next)
    set({ progress: next })
  },

  completeMission: (missionId) => {
    const { uid, progress } = get()
    if (!uid) return
    const next: Record<string, MissionProgress> = {
      ...progress,
      [missionId]: {
        ...progress[missionId],
        missionId,
        status: 'completed',
        startedAt: progress[missionId]?.startedAt ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        answeredFields: progress[missionId]?.totalFields,
      },
    }
    localProfileRepository.saveMissionProgress(uid, next)
    set({ progress: next })
  },

  setMissionFieldProgress: (missionId, answeredFields, totalFields) => {
    const { uid, progress } = get()
    if (!uid) return
    const current = progress[missionId]
    if (!current || current.status === 'completed') return
    if (current.answeredFields === answeredFields && current.totalFields === totalFields) return
    const next: Record<string, MissionProgress> = {
      ...progress,
      [missionId]: { ...current, answeredFields, totalFields },
    }
    localProfileRepository.saveMissionProgress(uid, next)
    set({ progress: next })
  },

  resetMission: (missionId) => {
    const { uid, progress } = get()
    if (!uid) return
    const next = {
      ...progress,
      [missionId]: { missionId, status: 'available' as const },
    }
    localProfileRepository.saveMissionProgress(uid, next)
    set({ progress: next })
  },

  resetAllData: () => {
    const { uid } = get()
    if (!uid) return
    localProfileRepository.clear(uid)
    set({ profile: null, progress: initialMissionProgress() })
  },
}))

export function useProfileStats() {
  const profile = useProfileStore((s) => s.profile)
  const progress = useProfileStore((s) => s.progress)
  return {
    completion: calculateProfileCompletion(profile, progress),
    xp: calculateXp(profile, progress),
    completedMissions: Object.values(progress).filter((p) => p.status === 'completed').length,
  }
}
