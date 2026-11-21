import { create } from 'zustand'
import type { MissionProgress, QuickStartProfile, SyncStatus } from '../types'
import {
  calculateProfileCompletion,
  calculateXp,
  initialMissionProgress,
  localProfileRepository,
} from '../services/profileService'
import { isFirestoreConfigured } from '../lib/firestore'
import {
  ensureUserAccount,
  getMissionProgress,
  getUserRecord,
  saveMissionProgress,
  saveUserProfile,
  updateUserAvatar,
} from '../services/cloud/firestoreRepository'
import { friendlyCloudError, withTimeout } from '../services/cloud/errors'

export interface ProfileHydrateOptions {
  cloud: boolean
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

interface ProfileState {
  uid: string | null
  profile: QuickStartProfile | null
  progress: Record<string, MissionProgress>
  avatarUrl: string | null
  avatarPath: string | null
  accountStatus: 'active' | 'suspended'
  hydrated: boolean
  cloudEnabled: boolean
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncedAt: string | null
  hydrate: (uid: string, options?: ProfileHydrateOptions) => Promise<void>
  clear: () => void
  saveQuickStart: (profile: QuickStartProfile) => void
  startMission: (missionId: string) => void
  completeMission: (missionId: string) => void
  resetMission: (missionId: string) => void
  setMissionFieldProgress: (
    missionId: string,
    answeredFields: number,
    totalFields: number,
  ) => void
  setAvatar: (url: string, path: string) => Promise<void>
  removeAvatar: () => Promise<void>
  resetAllData: () => void
}

function mergedProgress(saved: Record<string, MissionProgress>) {
  return { ...initialMissionProgress(), ...saved }
}

function savedEntries(saved: Record<string, MissionProgress>): MissionProgress[] {
  return Object.values(saved).filter(
    (mission) => mission.status !== 'available' || mission.answeredFields !== undefined,
  )
}

let profileWriteQueue: Promise<unknown> = Promise.resolve()

function settleCloud(
  set: (partial: Partial<ProfileState>) => void,
  task: () => Promise<unknown>,
) {
  set({ syncStatus: 'saving', syncError: null })
  const operation = profileWriteQueue.catch(() => undefined).then(task)
  profileWriteQueue = operation
  withTimeout(operation)
    .then(() =>
      set({
        syncStatus: 'synced',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      }),
    )
    .catch((error) => {
      set({ syncStatus: 'error', syncError: friendlyCloudError(error) })
    })
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  uid: null,
  profile: null,
  progress: {},
  avatarUrl: null,
  avatarPath: null,
  accountStatus: 'active',
  hydrated: false,
  cloudEnabled: false,
  syncStatus: 'local',
  syncError: null,
  lastSyncedAt: null,

  hydrate: async (uid, options = { cloud: false }) => {
    const localProfile = localProfileRepository.getQuickStart(uid)
    const saved = localProfileRepository.getMissionProgress(uid)
    const progress = mergedProgress(saved)
    const cloudEnabled = Boolean(options.cloud && isFirestoreConfigured)

    set({
      uid,
      profile: localProfile,
      progress,
      avatarUrl: options.photoURL ?? null,
      avatarPath: null,
      accountStatus: 'active',
      hydrated: !cloudEnabled || Boolean(localProfile),
      cloudEnabled,
      syncStatus: cloudEnabled ? 'loading' : 'local',
      syncError: cloudEnabled
        ? null
        : options.cloud && !isFirestoreConfigured
          ? 'Firestore is not configured. Data is kept in this browser.'
          : null,
    })

    if (!cloudEnabled) return

    try {
      const cloudResult = await withTimeout((async () => {
        await ensureUserAccount(uid, {
          email: options.email ?? null,
          displayName: options.displayName ?? localProfile?.name ?? null,
          photoURL: options.photoURL ?? null,
        })
        const account = await getUserRecord(uid)
        let cloudProgress = await getMissionProgress(uid)
        let profile = account?.profile ?? null
        return { account, cloudProgress, profile }
      })())
      const account = cloudResult.account
      let cloudProgress = cloudResult.cloudProgress
      let profile = cloudResult.profile

      // One-time migration of existing local data for this account. Cloud data
      // always wins once it exists, so this never overwrites real records.
      if (!profile && localProfile) {
        await saveUserProfile(uid, localProfile)
        profile = localProfile
      }
      if (!Object.keys(cloudProgress).length && Object.keys(saved).length) {
        await Promise.all(savedEntries(saved).map((mission) => saveMissionProgress(uid, mission)))
        cloudProgress = saved
      }

      set({
        profile,
        progress: mergedProgress(cloudProgress),
        avatarUrl:
          account?.avatarUrl ??
          (account?.avatarCleared ? null : account?.photoURL) ??
          options.photoURL ??
          null,
        avatarPath: account?.avatarPath ?? null,
        accountStatus: account?.accountStatus ?? 'active',
        hydrated: true,
        syncStatus: 'synced',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (error) {
      set({
        hydrated: true,
        syncStatus: 'error',
        syncError: friendlyCloudError(error),
      })
    }
  },

  clear: () =>
    set({
      uid: null,
      profile: null,
      progress: {},
      avatarUrl: null,
      avatarPath: null,
      accountStatus: 'active',
      hydrated: false,
      cloudEnabled: false,
      syncStatus: 'local',
      syncError: null,
      lastSyncedAt: null,
    }),

  saveQuickStart: (profile) => {
    const { uid, progress, cloudEnabled } = get()
    if (!uid) return
    localProfileRepository.saveQuickStart(uid, profile)
    const seeded = Object.keys(progress).length ? progress : initialMissionProgress()
    localProfileRepository.saveMissionProgress(uid, seeded)
    set({ profile, progress: seeded })
    if (cloudEnabled) {
      settleCloud(set, () => saveUserProfile(uid, profile))
    }
  },

  startMission: (missionId) => {
    const { uid, progress, cloudEnabled } = get()
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
    if (cloudEnabled) {
      settleCloud(set, () => saveMissionProgress(uid, next[missionId]))
    }
  },

  completeMission: (missionId) => {
    const { uid, progress, cloudEnabled } = get()
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
    if (cloudEnabled) {
      settleCloud(set, () => saveMissionProgress(uid, next[missionId]))
    }
  },

  setMissionFieldProgress: (missionId, answeredFields, totalFields) => {
    const { uid, progress, cloudEnabled } = get()
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
    if (cloudEnabled) {
      settleCloud(set, () => saveMissionProgress(uid, next[missionId]))
    }
  },

  resetMission: (missionId) => {
    const { uid, progress, cloudEnabled } = get()
    if (!uid) return
    const next = {
      ...progress,
      [missionId]: { missionId, status: 'available' as const },
    }
    localProfileRepository.saveMissionProgress(uid, next)
    set({ progress: next })
    if (cloudEnabled) {
      settleCloud(set, () => saveMissionProgress(uid, next[missionId]))
    }
  },

  setAvatar: async (url, path) => {
    const { uid, cloudEnabled } = get()
    if (!uid) throw new Error('No signed-in account.')
    if (cloudEnabled) {
      set({ syncStatus: 'saving', syncError: null })
      try {
        await withTimeout(updateUserAvatar(uid, { url, path }))
        set({
          avatarUrl: url,
          avatarPath: path,
          syncStatus: 'synced',
          syncError: null,
          lastSyncedAt: new Date().toISOString(),
        })
      } catch (error) {
        set({ syncStatus: 'error', syncError: friendlyCloudError(error) })
        throw error
      }
      return
    }
    set({ avatarUrl: url, avatarPath: path })
  },

  removeAvatar: async () => {
    const { uid, cloudEnabled } = get()
    if (!uid) throw new Error('No signed-in account.')
    if (cloudEnabled) {
      set({ syncStatus: 'saving', syncError: null })
      try {
        await withTimeout(updateUserAvatar(uid, { url: null, path: null }))
        set({
          avatarUrl: null,
          avatarPath: null,
          syncStatus: 'synced',
          syncError: null,
          lastSyncedAt: new Date().toISOString(),
        })
      } catch (error) {
        set({ syncStatus: 'error', syncError: friendlyCloudError(error) })
        throw error
      }
      return
    }
    set({ avatarUrl: null, avatarPath: null })
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
