import type { Achievement, MissionDefinition, MissionProgress, MissionStatus, QuickStartProfile } from '../types'
import { ACHIEVEMENTS, MISSIONS } from '../data/missions'

export function effectiveStatus(missionId: string, progress: Record<string, MissionProgress>): MissionStatus {
  return progress[missionId]?.status ?? 'available'
}

export function completedMissionIds(progress: Record<string, MissionProgress>) {
  return MISSIONS.filter((m) => progress[m.id]?.status === 'completed').map((m) => m.id)
}

export function nextMission(progress: Record<string, MissionProgress>): MissionDefinition | null {
  return (
    MISSIONS.find((mission) => progress[mission.id]?.status !== 'completed') ?? null
  )
}

export function inProgressMission(progress: Record<string, MissionProgress>): MissionDefinition | null {
  return MISSIONS.find((mission) => progress[mission.id]?.status === 'in_progress') ?? null
}

export function unlockedAchievements(
  profile: QuickStartProfile | null,
  progress: Record<string, MissionProgress>,
): Achievement[] {
  const completed = completedMissionIds(progress)
  return ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'first-step') return Boolean(profile)
    if (achievement.id === 'body-metrics') return completed.includes('body-metrics')
    if (achievement.id === 'training-ready') return completed.includes('training-history')
    if (achievement.id === 'nutrition-aware') return completed.includes('nutrition-profile')
    if (achievement.id === 'consistency') return completed.length >= 4
    if (achievement.id === 'profile-master') return completed.length === MISSIONS.length
    return false
  })
}

export function advancedUnlocked(progress: Record<string, MissionProgress>) {
  return completedMissionIds(progress).length === MISSIONS.length
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
