import { DEFAULT_PREFERENCES, type ActivityState } from '../types/activity'

const ACTIVITY_PREFIX = 'forge:v1:activity:'

function cloneEmpty(): ActivityState {
  return {
    workouts: [],
    meals: [],
    waterByDate: {},
    measurements: [],
    lifestyle: [],
    habitsByDate: {},
    aiSessions: [],
    preferences: {
      ...DEFAULT_PREFERENCES,
      notifications: { ...DEFAULT_PREFERENCES.notifications },
      privacy: { ...DEFAULT_PREFERENCES.privacy },
    },
  }
}

function normalise(value: Partial<ActivityState> | null): ActivityState {
  const empty = cloneEmpty()
  if (!value) return empty
  return {
    workouts: Array.isArray(value.workouts) ? value.workouts : [],
    meals: Array.isArray(value.meals) ? value.meals : [],
    waterByDate: value.waterByDate && typeof value.waterByDate === 'object' ? value.waterByDate : {},
    measurements: Array.isArray(value.measurements) ? value.measurements : [],
    lifestyle: Array.isArray(value.lifestyle) ? value.lifestyle : [],
    habitsByDate: value.habitsByDate && typeof value.habitsByDate === 'object' ? value.habitsByDate : {},
    aiSessions: Array.isArray(value.aiSessions) ? value.aiSessions : [],
    preferences: {
      ...empty.preferences,
      ...(value.preferences ?? {}),
      notifications: {
        ...empty.preferences.notifications,
        ...(value.preferences?.notifications ?? {}),
      },
      privacy: {
        ...empty.preferences.privacy,
        ...(value.preferences?.privacy ?? {}),
      },
    },
  }
}

export const activityRepository = {
  get(uid: string): ActivityState {
    try {
      const raw = localStorage.getItem(`${ACTIVITY_PREFIX}${uid}`)
      if (!raw) return cloneEmpty()
      return normalise(JSON.parse(raw) as Partial<ActivityState>)
    } catch {
      return cloneEmpty()
    }
  },

  save(uid: string, state: ActivityState) {
    try {
      localStorage.setItem(`${ACTIVITY_PREFIX}${uid}`, JSON.stringify(state))
    } catch {
      // The in-memory store remains usable when storage is unavailable.
    }
  },

  clear(uid: string) {
    try {
      localStorage.removeItem(`${ACTIVITY_PREFIX}${uid}`)
    } catch {
      // Ignore unavailable storage.
    }
  },
}

export { cloneEmpty as emptyActivity }
