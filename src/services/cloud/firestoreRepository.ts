import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import { firestore } from '../../lib/firestore'
import type {
  AISessionRecord,
  ActivityState,
  CompletedWorkout,
  LifestyleEntry,
  MeasurementRecord,
  MealEntry,
  UserPreferences,
} from '../../types/activity'
import type { MissionProgress, QuickStartProfile } from '../../types'
import { emptyActivity } from '../activityService'

const USERS = 'users'

export interface CloudUserRecord {
  uid: string
  fullName: string | null
  email: string | null
  photoURL: string | null
  avatarUrl: string | null
  avatarPath: string | null
  avatarCleared: boolean
  profile: QuickStartProfile | null
}


function withoutUndefined(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

function db(): Firestore {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add the Firebase environment variables and restart the app.')
  }
  return firestore
}

function userDoc(uid: string) {
  return doc(db(), USERS, uid)
}

function subCollection(uid: string, name: string) {
  return collection(db(), USERS, uid, name)
}

function iso(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as Timestamp).toDate().toISOString()
    } catch {
      // Fall through to the current timestamp.
    }
  }
  return new Date().toISOString()
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normaliseProfile(data: DocumentData): QuickStartProfile | null {
  if (typeof data.profileCompletedAt !== 'string') return null
  if (
    typeof data.age !== 'number' ||
    typeof data.heightCm !== 'number' ||
    typeof data.weightKg !== 'number' ||
    typeof data.fitnessGoal !== 'string' ||
    typeof data.fitnessLevel !== 'string' ||
    !Array.isArray(data.preferredWorkoutDays)
  ) {
    return null
  }
  return {
    name: typeof data.fullName === 'string' ? data.fullName : '',
    age: data.age,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    goal: data.fitnessGoal,
    experience: data.fitnessLevel,
    workoutDays: data.preferredWorkoutDays.filter((day: unknown) => typeof day === 'number'),
    completedAt: data.profileCompletedAt,
  } as QuickStartProfile
}

export async function getUserRecord(uid: string): Promise<CloudUserRecord | null> {
  const snapshot = await getDoc(userDoc(uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    uid,
    fullName: stringOrNull(data.fullName),
    email: stringOrNull(data.email),
    photoURL: stringOrNull(data.photoURL),
    avatarUrl: stringOrNull(data.avatarUrl),
    avatarPath: stringOrNull(data.avatarPath),
    avatarCleared: data.avatarCleared === true,
    profile: normaliseProfile(data),
  }
}

export async function ensureUserAccount(
  uid: string,
  account: { email: string | null; displayName: string | null; photoURL?: string | null },
): Promise<void> {
  const snapshot = await getDoc(userDoc(uid))
  if (snapshot.exists()) return
  await setDoc(userDoc(uid), {
    uid,
    fullName: account.displayName ?? null,
    email: account.email ?? null,
    photoURL: account.photoURL ?? null,
    avatarUrl: null,
    avatarPath: null,
    avatarCleared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  })
}

export async function saveUserProfile(
  uid: string,
  profile: QuickStartProfile,
  account?: { email: string | null; displayName: string | null },
): Promise<void> {
  const data: Record<string, unknown> = {
    uid,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    fitnessGoal: profile.goal,
    fitnessLevel: profile.experience,
    preferredWorkoutDays: profile.workoutDays,
    profileCompletedAt: profile.completedAt,
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }
  if (profile.name) data.fullName = profile.name
  if (account?.displayName && !profile.name) data.fullName = account.displayName
  if (account) data.email = account.email
  await setDoc(userDoc(uid), data, { merge: true })
}

export async function updateUserAvatar(
  uid: string,
  avatar: { url: string | null; path: string | null },
): Promise<void> {
  await setDoc(
    userDoc(uid),
    {
      avatarUrl: avatar.url,
      avatarPath: avatar.path,
      avatarCleared: !avatar.url,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function getMissionProgress(
  uid: string,
): Promise<Record<string, MissionProgress>> {
  const snapshot = await getDocs(subCollection(uid, 'missions'))
  const progress: Record<string, MissionProgress> = {}
  snapshot.forEach((entry) => {
    const data = entry.data()
    const missionId = typeof data.missionId === 'string' ? data.missionId : entry.id
    progress[missionId] = {
      missionId,
      status: data.status ?? 'available',
      startedAt: typeof data.startedAt === 'string' ? data.startedAt : undefined,
      completedAt: typeof data.completedAt === 'string' ? data.completedAt : undefined,
      answeredFields: numberOrNull(data.answeredFields) ?? undefined,
      totalFields: numberOrNull(data.totalFields) ?? undefined,
    }
  })
  return progress
}

export async function saveMissionProgress(
  uid: string,
  mission: MissionProgress,
): Promise<void> {
  await setDoc(
    doc(db(), USERS, uid, 'missions', mission.missionId),
    {
      ...withoutUndefined({ ...mission, userId: uid }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function getWorkouts(uid: string): Promise<CompletedWorkout[]> {
  const snapshot = await getDocs(
    query(subCollection(uid, 'workouts'), orderBy('completedAt', 'desc')),
  )
  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return {
      id: entry.id,
      workoutId: typeof data.workoutId === 'string' ? data.workoutId : entry.id,
      title: typeof data.title === 'string' ? data.title : 'Workout',
      focus: typeof data.focus === 'string' ? data.focus : '',
      completedAt: iso(data.completedAt),
      durationSeconds: numberOrNull(data.durationSeconds) ?? 0,
      exercisesCompleted: numberOrNull(data.exercisesCompleted) ?? 0,
      totalExercises: numberOrNull(data.totalExercises) ?? 0,
      source: data.source === 'ai' ? 'ai' : 'plan',
    }
  })
}

export async function saveWorkout(uid: string, workout: CompletedWorkout): Promise<void> {
  await setDoc(doc(db(), USERS, uid, 'workouts', workout.id), {
    ...withoutUndefined({ ...workout, userId: uid }),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkout(uid: string, workoutId: string): Promise<void> {
  await deleteDoc(doc(db(), USERS, uid, 'workouts', workoutId))
}

export async function getNutritionLogs(uid: string): Promise<{
  meals: MealEntry[]
  waterByDate: Record<string, number>
}> {
  const snapshot = await getDocs(subCollection(uid, 'nutrition_logs'))
  const meals: MealEntry[] = []
  const waterByDate: Record<string, number> = {}
  snapshot.forEach((entry) => {
    const data = entry.data()
    const date = typeof data.date === 'string' ? data.date : entry.id
    if (Array.isArray(data.meals)) {
      data.meals.forEach((meal: DocumentData) => {
        if (!meal || typeof meal !== 'object' || typeof meal.id !== 'string') return
        meals.push({
          id: meal.id,
          date: typeof meal.date === 'string' ? meal.date : date,
          time: typeof meal.time === 'string' ? meal.time : '00:00',
          name: typeof meal.name === 'string' ? meal.name : 'Meal',
          calories: numberOrNull(meal.calories) ?? 0,
          protein: numberOrNull(meal.protein) ?? 0,
          carbs: numberOrNull(meal.carbs) ?? 0,
          fat: numberOrNull(meal.fat) ?? 0,
        })
      })
    }
    if (typeof data.waterIntake === 'number') waterByDate[date] = data.waterIntake
  })
  meals.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  return { meals, waterByDate }
}

export async function saveNutritionDay(
  uid: string,
  date: string,
  meals: MealEntry[],
  waterIntake: number,
): Promise<void> {
  const totals = meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
  await setDoc(doc(db(), USERS, uid, 'nutrition_logs', date), {
    date,
    userId: uid,
    meals,
    waterIntake,
    totals,
    updatedAt: serverTimestamp(),
  })
}

export async function getMeasurements(uid: string): Promise<MeasurementRecord[]> {
  const snapshot = await getDocs(
    query(subCollection(uid, 'progress_records'), orderBy('measuredAt', 'desc')),
  )
  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return {
      id: entry.id,
      measuredAt: iso(data.measuredAt),
      weightKg: numberOrNull(data.weightKg) ?? 0,
      bodyFat: numberOrNull(data.bodyFat) ?? undefined,
      waistCm: numberOrNull(data.waistCm) ?? undefined,
      chestCm: numberOrNull(data.chestCm) ?? undefined,
      restingHr: numberOrNull(data.restingHr) ?? undefined,
    }
  })
}

export async function saveMeasurement(uid: string, record: MeasurementRecord): Promise<void> {
  await setDoc(doc(db(), USERS, uid, 'progress_records', record.id), {
    ...withoutUndefined({
      ...record,
      userId: uid,
      recordDate: record.measuredAt.slice(0, 10),
    }),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMeasurement(uid: string, recordId: string): Promise<void> {
  await deleteDoc(doc(db(), USERS, uid, 'progress_records', recordId))
}

export async function getLifestyle(uid: string): Promise<{
  lifestyle: LifestyleEntry[]
  habitsByDate: Record<string, string[]>
}> {
  const snapshot = await getDocs(subCollection(uid, 'lifestyle_logs'))
  const lifestyle: LifestyleEntry[] = []
  const habitsByDate: Record<string, string[]> = {}
  snapshot.forEach((entry) => {
    const data = entry.data()
    const date = typeof data.date === 'string' ? data.date : entry.id
    if (Array.isArray(data.habits)) {
      habitsByDate[date] = data.habits.filter((habit: unknown) => typeof habit === 'string')
    }
    if (typeof data.sleepHours === 'number') {
      lifestyle.push({
        id: typeof data.id === 'string' ? data.id : entry.id,
        date,
        sleepHours: data.sleepHours,
        sleepQuality: numberOrNull(data.sleepQuality) ?? 3,
        steps: numberOrNull(data.steps) ?? 0,
        stress: numberOrNull(data.stress) ?? 3,
        recoveryHabits: Array.isArray(data.recoveryHabits)
          ? data.recoveryHabits.filter((habit: unknown) => typeof habit === 'string')
          : [],
      })
    }
  })
  lifestyle.sort((a, b) => b.date.localeCompare(a.date))
  return { lifestyle, habitsByDate }
}

export async function saveLifestyle(uid: string, entry: LifestyleEntry): Promise<void> {
  await setDoc(
    doc(db(), USERS, uid, 'lifestyle_logs', entry.date),
    {
      ...entry,
      userId: uid,
      date: entry.date,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function saveHabits(
  uid: string,
  date: string,
  habits: string[],
): Promise<void> {
  await setDoc(
    doc(db(), USERS, uid, 'lifestyle_logs', date),
    {
      date,
      userId: uid,
      habits,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function getAISessions(uid: string): Promise<AISessionRecord[]> {
  const snapshot = await getDocs(
    query(subCollection(uid, 'ai_sessions'), orderBy('completedAt', 'desc')),
  )
  return snapshot.docs.map((entry) => {
    const data = entry.data()
    return {
      id: entry.id,
      exercise: data.exercise ?? 'squat',
      exerciseLabel: typeof data.exerciseLabel === 'string' ? data.exerciseLabel : 'Exercise',
      completedAt: iso(data.completedAt),
      durationSeconds: numberOrNull(data.durationSeconds) ?? 0,
      reps: numberOrNull(data.reps) ?? 0,
      scores: Array.isArray(data.scores) ? data.scores : [],
      averageFormScore: numberOrNull(data.averageFormScore),
      bestFormScore: numberOrNull(data.bestFormScore),
      verdict: data.verdict ?? 'insufficient-data',
      source: data.source === 'video' ? 'video' : 'camera',
    } as AISessionRecord
  })
}

export async function saveAISession(uid: string, session: AISessionRecord): Promise<void> {
  await setDoc(doc(db(), USERS, uid, 'ai_sessions', session.id), {
    ...withoutUndefined({ ...session, userId: uid }),
    updatedAt: serverTimestamp(),
  })
}

export async function getPreferences(uid: string): Promise<UserPreferences | null> {
  const snapshot = await getDoc(doc(db(), USERS, uid, 'user_settings', 'preferences'))
  if (!snapshot.exists()) return null
  return snapshot.data().preferences ?? null
}

export async function savePreferences(
  uid: string,
  preferences: UserPreferences,
): Promise<void> {
  await setDoc(
    doc(db(), USERS, uid, 'user_settings', 'preferences'),
    {
      userId: uid,
      preferences,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function loadActivity(uid: string): Promise<{
  state: ActivityState
  documentCount: number
}> {
  const [workouts, nutrition, measurements, lifestyle, aiSessions, preferences] =
    await Promise.all([
      getWorkouts(uid),
      getNutritionLogs(uid),
      getMeasurements(uid),
      getLifestyle(uid),
      getAISessions(uid),
      getPreferences(uid),
    ])
  const empty = emptyActivity()
  const documentCount =
    workouts.length +
    measurements.length +
    lifestyle.lifestyle.length +
    aiSessions.length +
    Object.keys(nutrition.waterByDate).length +
    Object.keys(lifestyle.habitsByDate).length
  return {
    state: {
      ...empty,
      workouts,
      meals: nutrition.meals,
      waterByDate: nutrition.waterByDate,
      measurements,
      lifestyle: lifestyle.lifestyle,
      habitsByDate: lifestyle.habitsByDate,
      aiSessions,
      preferences: preferences ?? empty.preferences,
    },
    documentCount,
  }
}

export async function writeActivitySnapshot(uid: string, state: ActivityState): Promise<void> {
  // Keep migration simple and reliable: write each record through the same
  // validated repositories used by live mutations.
  await Promise.all([
    ...state.workouts.map((item) => saveWorkout(uid, item)),
    ...state.measurements.map((item) => saveMeasurement(uid, item)),
    ...state.lifestyle.map((item) => saveLifestyle(uid, item)),
    ...state.aiSessions.map((item) => saveAISession(uid, item)),
    ...Object.entries(state.habitsByDate).map(([date, habits]) => saveHabits(uid, date, habits)),
  ])

  const nutritionDates = [
    ...new Set([...state.meals.map((meal) => meal.date), ...Object.keys(state.waterByDate)]),
  ]
  await Promise.all(
    nutritionDates.map((date) =>
      saveNutritionDay(
        uid,
        date,
        state.meals.filter((meal) => meal.date === date),
        state.waterByDate[date] ?? 0,
      ),
    ),
  )

  if (state.preferences) await savePreferences(uid, state.preferences)
}

export async function deleteAllActivity(uid: string): Promise<void> {
  const collections = [
    'workouts',
    'nutrition_logs',
    'progress_records',
    'lifestyle_logs',
    'ai_sessions',
    'workout_sessions',
  ]
  for (const name of collections) {
    const snapshot = await getDocs(subCollection(uid, name))
    await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
  }
}

export async function deleteAllMissionProgress(uid: string): Promise<void> {
  const snapshot = await getDocs(subCollection(uid, 'missions'))
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
}

export function firestoreAvailable(): boolean {
  return Boolean(firestore)
}
