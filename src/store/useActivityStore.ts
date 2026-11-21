import { create } from 'zustand'
import type {
  AISessionRecord,
  ActivityState,
  CompletedWorkout,
  LifestyleEntry,
  MeasurementRecord,
  MealEntry,
  UserPreferences,
} from '../types/activity'
import type { SyncStatus } from '../types'
import { emptyActivity, activityRepository } from '../services/activityService'
import { createId } from '../lib/id'
import { isFirestoreConfigured } from '../lib/firestore'
import {
  deleteAllActivity,
  loadActivity,
  saveAISession,
  saveHabits,
  saveLifestyle,
  saveMeasurement,
  saveNutritionDay,
  savePreferences,
  saveWorkout,
  writeActivitySnapshot,
  deleteMeasurement,
} from '../services/cloud/firestoreRepository'
import { friendlyCloudError, withTimeout } from '../services/cloud/errors'

interface ActivityHydrateOptions {
  cloud: boolean
}

interface ActivityStore extends ActivityState {
  uid: string | null
  hydrated: boolean
  cloudEnabled: boolean
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncedAt: string | null
  hydrate: (uid: string, options?: ActivityHydrateOptions) => Promise<void>
  clear: () => void
  addWorkout: (workout: Omit<CompletedWorkout, 'id'>) => void
  addMeal: (meal: Omit<MealEntry, 'id'>) => void
  removeMeal: (mealId: string) => void
  setWater: (date: string, glasses: number) => void
  addMeasurement: (measurement: Omit<MeasurementRecord, 'id'>) => void
  removeMeasurement: (measurementId: string) => void
  saveLifestyleEntry: (entry: Omit<LifestyleEntry, 'id'>) => void
  toggleHabit: (date: string, habitId: string) => void
  setHabits: (date: string, habitIds: string[]) => void
  addAISession: (session: Omit<AISessionRecord, 'id'>) => void
  setPreferences: (preferences: UserPreferences) => void
  clearActivity: () => Promise<void>
}

function persist(uid: string | null, state: ActivityState) {
  if (uid) activityRepository.save(uid, state)
}

function isActivityEmpty(state: ActivityState): boolean {
  return (
    state.workouts.length === 0 &&
    state.meals.length === 0 &&
    state.measurements.length === 0 &&
    state.lifestyle.length === 0 &&
    state.aiSessions.length === 0 &&
    Object.keys(state.waterByDate).length === 0 &&
    Object.keys(state.habitsByDate).length === 0
  )
}

let activityWriteQueue: Promise<unknown> = Promise.resolve()

function syncCloud(
  set: (partial: Partial<ActivityStore>) => void,
  enabled: boolean,
  task: () => Promise<unknown>,
) {
  if (!enabled) return
  set({ syncStatus: 'saving', syncError: null })
  const operation = activityWriteQueue.catch(() => undefined).then(task)
  activityWriteQueue = operation
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

export const useActivityStore = create<ActivityStore>((set, get) => ({
  ...emptyActivity(),
  uid: null,
  hydrated: false,
  cloudEnabled: false,
  syncStatus: 'local',
  syncError: null,
  lastSyncedAt: null,

  hydrate: async (uid, options = { cloud: false }) => {
    const local = activityRepository.get(uid)
    const cloudEnabled = Boolean(options.cloud && isFirestoreConfigured)
    set({
      ...local,
      uid,
      hydrated: true,
      cloudEnabled,
      syncStatus: cloudEnabled ? 'loading' : 'local',
      syncError: cloudEnabled
        ? null
        : options.cloud && !isFirestoreConfigured
          ? 'Firestore is not configured. Data is kept in this browser.'
          : null,
      lastSyncedAt: null,
    })

    if (!cloudEnabled) return

    try {
      const cloud = await withTimeout(loadActivity(uid))
      if (isActivityEmpty(cloud.state) && !isActivityEmpty(local)) {
        await withTimeout(writeActivitySnapshot(uid, local))
        set({
          ...local,
          syncStatus: 'synced',
          syncError: null,
          lastSyncedAt: new Date().toISOString(),
        })
        return
      }
      set({
        ...cloud.state,
        syncStatus: 'synced',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (error) {
      set({ syncStatus: 'error', syncError: friendlyCloudError(error) })
    }
  },

  clear: () =>
    set({
      ...emptyActivity(),
      uid: null,
      hydrated: false,
      cloudEnabled: false,
      syncStatus: 'local',
      syncError: null,
      lastSyncedAt: null,
    }),

  addWorkout: (workout) => {
    const state = get()
    const created = { ...workout, id: createId('workout') }
    const next = [created, ...state.workouts].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    )
    set({ workouts: next })
    persist(state.uid, { ...state, workouts: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => saveWorkout(uid, created))
    }
  },

  addMeal: (meal) => {
    const state = get()
    const created = { ...meal, id: createId('meal') }
    const next = [created, ...state.meals].sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    )
    set({ meals: next })
    persist(state.uid, { ...state, meals: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () =>
        saveNutritionDay(
          uid,
          created.date,
          next.filter((item) => item.date === created.date),
          state.waterByDate[created.date] ?? 0,
        ),
      )
    }
  },

  removeMeal: (mealId) => {
    const state = get()
    const removed = state.meals.find((meal) => meal.id === mealId)
    const next = state.meals.filter((meal) => meal.id !== mealId)
    set({ meals: next })
    persist(state.uid, { ...state, meals: next })
    if (state.uid && state.cloudEnabled && removed) {
      const uid = state.uid
      syncCloud(set, true, () =>
        saveNutritionDay(
          uid,
          removed.date,
          next.filter((item) => item.date === removed.date),
          state.waterByDate[removed.date] ?? 0,
        ),
      )
    }
  },

  setWater: (date, glasses) => {
    const state = get()
    const next = { ...state.waterByDate, [date]: Math.max(0, Math.min(24, glasses)) }
    set({ waterByDate: next })
    persist(state.uid, { ...state, waterByDate: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () =>
        saveNutritionDay(
          uid,
          date,
          state.meals.filter((meal) => meal.date === date),
          next[date],
        ),
      )
    }
  },

  addMeasurement: (measurement) => {
    const state = get()
    const created = { ...measurement, id: createId('measurement') }
    const next = [created, ...state.measurements].sort((a, b) =>
      b.measuredAt.localeCompare(a.measuredAt),
    )
    set({ measurements: next })
    persist(state.uid, { ...state, measurements: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => saveMeasurement(uid, created))
    }
  },

  removeMeasurement: (measurementId) => {
    const state = get()
    const next = state.measurements.filter((entry) => entry.id !== measurementId)
    set({ measurements: next })
    persist(state.uid, { ...state, measurements: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => deleteMeasurement(uid, measurementId))
    }
  },

  saveLifestyleEntry: (entry) => {
    const state = get()
    const existing = state.lifestyle.find((item) => item.date === entry.date)
    const next = existing
      ? state.lifestyle.map((item) =>
          item.date === entry.date ? { ...item, ...entry, id: item.id } : item,
        )
      : [{ ...entry, id: createId('lifestyle') }, ...state.lifestyle]
    next.sort((a, b) => b.date.localeCompare(a.date))
    set({ lifestyle: next })
    persist(state.uid, { ...state, lifestyle: next })
    const saved = next.find((item) => item.date === entry.date)
    if (state.uid && state.cloudEnabled && saved) {
      const uid = state.uid
      syncCloud(set, true, () => saveLifestyle(uid, saved))
    }
  },

  toggleHabit: (date, habitId) => {
    const state = get()
    const current = state.habitsByDate[date] ?? []
    const values = current.includes(habitId)
      ? current.filter((id) => id !== habitId)
      : [...current, habitId]
    const next = { ...state.habitsByDate, [date]: values }
    set({ habitsByDate: next })
    persist(state.uid, { ...state, habitsByDate: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => saveHabits(uid, date, values))
    }
  },

  setHabits: (date, habitIds) => {
    const state = get()
    const next = { ...state.habitsByDate, [date]: habitIds }
    set({ habitsByDate: next })
    persist(state.uid, { ...state, habitsByDate: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => saveHabits(uid, date, habitIds))
    }
  },

  addAISession: (session) => {
    const state = get()
    const created = { ...session, id: createId('ai-session') }
    const next = [created, ...state.aiSessions].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    )
    set({ aiSessions: next })
    persist(state.uid, { ...state, aiSessions: next })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => saveAISession(uid, created))
    }
  },

  setPreferences: (preferences) => {
    const state = get()
    set({ preferences })
    persist(state.uid, { ...state, preferences })
    if (state.uid && state.cloudEnabled) {
      const uid = state.uid
      syncCloud(set, true, () => savePreferences(uid, preferences))
    }
  },

  clearActivity: async () => {
    const state = get()
    if (state.uid && state.cloudEnabled) {
      set({ syncStatus: 'saving', syncError: null })
      try {
        await withTimeout(deleteAllActivity(state.uid))
      } catch (error) {
        set({ syncStatus: 'error', syncError: friendlyCloudError(error) })
        throw error
      }
    }
    if (state.uid) activityRepository.clear(state.uid)
    set({
      ...emptyActivity(),
      uid: state.uid,
      hydrated: true,
      syncStatus: state.cloudEnabled ? 'synced' : 'local',
      syncError: null,
      lastSyncedAt: state.cloudEnabled ? new Date().toISOString() : null,
    })
  },
}))
