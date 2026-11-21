import type { MissionAnswerMap, MissionAnswers, RecommendationDocument } from '../types'
import { firestore } from '../../../lib/firestore'
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

const ANSWERS_PREFIX = 'forge:v1:mission-answers:'
const RECOMMENDATIONS_PREFIX = 'forge:v1:recommendations:'
const ANSWERS_COLLECTION = 'mission_answers'
const RECOMMENDATIONS_COLLECTION = 'workout_recommendations'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable; the in-memory store still works.
  }
}

function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore.
  }
}

function iso(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return new Date().toISOString()
}

function requireDb() {
  if (!firestore) throw new Error('Firestore is not configured.')
  return firestore
}

// ------------------------------------------------------------------ local
export const localRecommendationRepository = {
  getAnswers(uid: string): MissionAnswerMap {
    return readJson<MissionAnswerMap>(`${ANSWERS_PREFIX}${uid}`, {})
  },
  saveAnswers(uid: string, answers: MissionAnswerMap) {
    writeJson(`${ANSWERS_PREFIX}${uid}`, answers)
  },
  getRecommendations(uid: string): RecommendationDocument[] {
    return readJson<RecommendationDocument[]>(`${RECOMMENDATIONS_PREFIX}${uid}`, [])
  },
  saveRecommendations(uid: string, plans: RecommendationDocument[]) {
    writeJson(`${RECOMMENDATIONS_PREFIX}${uid}`, plans)
  },
  clear(uid: string) {
    removeKey(`${ANSWERS_PREFIX}${uid}`)
    removeKey(`${RECOMMENDATIONS_PREFIX}${uid}`)
  },
}

// ------------------------------------------------------------------ cloud
export async function fetchMissionAnswers(uid: string): Promise<MissionAnswerMap> {
  const snapshot = await getDocs(collection(requireDb(), 'users', uid, ANSWERS_COLLECTION))
  const answers: MissionAnswerMap = {}
  snapshot.forEach((entry) => {
    answers[entry.id] = entry.data().values ?? {}
  })
  return answers
}

export async function persistMissionAnswers(
  uid: string,
  missionId: string,
  values: MissionAnswers,
): Promise<void> {
  await setDoc(
    doc(requireDb(), 'users', uid, ANSWERS_COLLECTION, missionId),
    {
      missionId,
      userId: uid,
      values,
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
    },
    { merge: true },
  )
}

function normalisePlan(id: string, data: Record<string, unknown>): RecommendationDocument {
  return {
    ...(data as unknown as RecommendationDocument),
    recommendationId: typeof data.recommendationId === 'string' ? data.recommendationId : id,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  }
}

export async function fetchRecommendations(uid: string): Promise<RecommendationDocument[]> {
  const snapshot = await getDocs(
    query(collection(requireDb(), 'users', uid, RECOMMENDATIONS_COLLECTION), orderBy('createdAt', 'desc')),
  )
  return snapshot.docs.map((entry) => normalisePlan(entry.id, entry.data()))
}

export async function persistRecommendation(
  uid: string,
  plan: RecommendationDocument,
): Promise<void> {
  await setDoc(
    doc(requireDb(), 'users', uid, RECOMMENDATIONS_COLLECTION, plan.recommendationId),
    {
      ...plan,
      userId: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deactivateRecommendations(uid: string, exceptId?: string): Promise<void> {
  const plans = await fetchRecommendations(uid)
  await Promise.all(
    plans
      .filter((plan) => plan.isActive && plan.recommendationId !== exceptId)
      .map((plan) =>
        setDoc(
          doc(requireDb(), 'users', uid, RECOMMENDATIONS_COLLECTION, plan.recommendationId),
          { isActive: false, updatedAt: serverTimestamp() },
          { merge: true },
        ),
      ),
  )
}

export async function markRecommendationsOutdated(uid: string, isOutdated: boolean): Promise<void> {
  const plans = await fetchRecommendations(uid)
  await Promise.all(
    plans
      .filter((plan) => plan.isActive)
      .map((plan) =>
        setDoc(
          doc(requireDb(), 'users', uid, RECOMMENDATIONS_COLLECTION, plan.recommendationId),
          { isOutdated, updatedAt: serverTimestamp() },
          { merge: true },
        ),
      ),
  )
}

export async function deleteAllMissionAnswers(uid: string): Promise<void> {
  const snapshot = await getDocs(collection(requireDb(), 'users', uid, ANSWERS_COLLECTION))
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
}

export async function deleteAllRecommendations(uid: string): Promise<void> {
  const snapshot = await getDocs(collection(requireDb(), 'users', uid, RECOMMENDATIONS_COLLECTION))
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)))
}
