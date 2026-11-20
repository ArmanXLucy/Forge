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
import { emptyActivity, activityRepository } from '../services/activityService'
import { createId } from '../lib/id'

interface ActivityStore extends ActivityState {
  uid: string | null
  hydrated: boolean
  hydrate: (uid: string) => void
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
  clearActivity: () => void
}

function persist(uid: string | null, state: ActivityState) {
  if (uid) activityRepository.save(uid, state)
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  ...emptyActivity(),
  uid: null,
  hydrated: false,

  hydrate: (uid) => {
    const stored = activityRepository.get(uid)
    set({ ...stored, uid, hydrated: true })
  },

  clear: () => set({ ...emptyActivity(), uid: null, hydrated: false }),

  addWorkout: (workout) => {
    const state = get()
    const next = [
      { ...workout, id: createId('workout') },
      ...state.workouts,
    ].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    set({ workouts: next })
    persist(state.uid, { ...state, workouts: next })
  },

  addMeal: (meal) => {
    const state = get()
    const next = [{ ...meal, id: createId('meal') }, ...state.meals].sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    )
    set({ meals: next })
    persist(state.uid, { ...state, meals: next })
  },

  removeMeal: (mealId) => {
    const state = get()
    const next = state.meals.filter((meal) => meal.id !== mealId)
    set({ meals: next })
    persist(state.uid, { ...state, meals: next })
  },

  setWater: (date, glasses) => {
    const state = get()
    const next = { ...state.waterByDate, [date]: Math.max(0, Math.min(24, glasses)) }
    set({ waterByDate: next })
    persist(state.uid, { ...state, waterByDate: next })
  },

  addMeasurement: (measurement) => {
    const state = get()
    const next = [
      { ...measurement, id: createId('measurement') },
      ...state.measurements,
    ].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    set({ measurements: next })
    persist(state.uid, { ...state, measurements: next })
  },

  removeMeasurement: (measurementId) => {
    const state = get()
    const next = state.measurements.filter((entry) => entry.id !== measurementId)
    set({ measurements: next })
    persist(state.uid, { ...state, measurements: next })
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
  },

  setHabits: (date, habitIds) => {
    const state = get()
    const next = { ...state.habitsByDate, [date]: habitIds }
    set({ habitsByDate: next })
    persist(state.uid, { ...state, habitsByDate: next })
  },

  addAISession: (session) => {
    const state = get()
    const next = [
      { ...session, id: createId('ai-session') },
      ...state.aiSessions,
    ].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    set({ aiSessions: next })
    persist(state.uid, { ...state, aiSessions: next })
  },

  setPreferences: (preferences) => {
    const state = get()
    set({ preferences })
    persist(state.uid, { ...state, preferences })
  },

  clearActivity: () => {
    const { uid } = get()
    if (uid) activityRepository.clear(uid)
    set({ ...emptyActivity(), uid, hydrated: true })
  },
}))
