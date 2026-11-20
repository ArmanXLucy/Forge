import type { MissionProgress, QuickStartProfile } from '../types'
import { MISSIONS } from '../data/missions'

/**
 * Frontend-only profile repository.
 *
 * Only NON-SENSITIVE data is persisted here: the Quick Start profile and mission
 * status. Sensitive mission answers (medical, medication, allergies, reports,
 * photographs) are intentionally never written to localStorage — they live in
 * component memory and are discarded. A secure backend will own them in Stage 2.
 */
export interface ProfileRepository {
  getQuickStart(uid: string): QuickStartProfile | null
  saveQuickStart(uid: string, profile: QuickStartProfile): void
  getMissionProgress(uid: string): Record<string, MissionProgress>
  saveMissionProgress(uid: string, progress: Record<string, MissionProgress>): void
  clear(uid: string): void
}

const PROFILE_PREFIX = 'forge:v1:profile:'
const MISSIONS_PREFIX = 'forge:v1:missions:'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode). The in-memory store still works.
  }
}

export const localProfileRepository: ProfileRepository = {
  getQuickStart(uid) {
    return readJson<QuickStartProfile | null>(`${PROFILE_PREFIX}${uid}`, null)
  },
  saveQuickStart(uid, profile) {
    writeJson(`${PROFILE_PREFIX}${uid}`, profile)
  },
  getMissionProgress(uid) {
    return readJson<Record<string, MissionProgress>>(`${MISSIONS_PREFIX}${uid}`, {})
  },
  saveMissionProgress(uid, progress) {
    writeJson(`${MISSIONS_PREFIX}${uid}`, progress)
  },
  clear(uid) {
    try {
      localStorage.removeItem(`${PROFILE_PREFIX}${uid}`)
      localStorage.removeItem(`${MISSIONS_PREFIX}${uid}`)
    } catch {
      // Ignore.
    }
  },
}

export function initialMissionProgress(): Record<string, MissionProgress> {
  return Object.fromEntries(
    MISSIONS.map((mission) => [mission.id, { missionId: mission.id, status: 'available' as const }]),
  )
}

export function calculateProfileCompletion(
  profile: QuickStartProfile | null,
  progress: Record<string, MissionProgress>,
) {
  if (!profile) return 0
  const completed = MISSIONS.filter((m) => progress[m.id]?.status === 'completed').length
  return Math.min(100, Math.round(10 + (completed / MISSIONS.length) * 90))
}

export function calculateXp(
  profile: QuickStartProfile | null,
  progress: Record<string, MissionProgress>,
) {
  if (!profile) return 0
  const base = 50
  const missionXp = MISSIONS.reduce(
    (sum, mission) => sum + (progress[mission.id]?.status === 'completed' ? mission.xp : 0),
    0,
  )
  return base + missionXp
}
