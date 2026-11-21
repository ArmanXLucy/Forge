import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { firestore } from '../../lib/firestore'
import { ROLE_PERMISSIONS } from '../../types/admin'
import type {
  AdminExercise,
  AdminNutritionPlan,
  AdminRole,
  AdminSnapshot,
  AdminUser,
  AdminUserDetail,
  AdminUserSummary,
  AdminWorkoutPlan,
  PlatformSettings,
} from '../../types/admin'
import type {
  AppNotification,
  SupportCategory,
  SupportInternalNote,
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
} from '../../types/support'

const ADMIN_USERS = 'adminUsers'
const SUPPORT_TICKETS = 'supportTickets'
const NOTIFICATIONS = 'notifications'
const ACTIVITY_LOGS = 'adminActivityLogs'

function db() {
  if (!firestore) throw new Error('Firestore is not configured.')
  return firestore
}

function iso(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === 'string' && value) return value
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as Timestamp).toDate().toISOString()
    } catch {
      return fallback
    }
  }
  return fallback
}

function isoOrNull(value: unknown): string | null {
  if (!value) return null
  return iso(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clean(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

function normaliseAdmin(id: string, data: DocumentData): AdminUser {
  const role = (data.role as AdminRole) || 'analyst'
  return {
    uid: str(data.uid, id),
    email: str(data.email),
    name: str(data.name, str(data.email, 'Administrator')),
    role,
    permissions: Array.isArray(data.permissions)
      ? data.permissions
      : ROLE_PERMISSIONS[role] ?? [],
    active: data.active !== false,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    lastLoginAt: isoOrNull(data.lastLoginAt),
  }
}

function normaliseUser(id: string, data: DocumentData): AdminUserSummary {
  return {
    uid: id,
    fullName: str(data.fullName, str(data.email, 'Athlete')),
    email: str(data.email),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    accountStatus: data.accountStatus === 'suspended' ? 'suspended' : 'active',
    goal: typeof data.fitnessGoal === 'string' ? data.fitnessGoal : null,
    experience: typeof data.fitnessLevel === 'string' ? data.fitnessLevel : null,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    profileCompletedAt:
      typeof data.profileCompletedAt === 'string' ? data.profileCompletedAt : null,
  }
}

function normaliseTicket(id: string, data: DocumentData): SupportTicket {
  const created = iso(data.createdAt)
  return {
    id,
    ticketId: str(data.ticketId, id),
    userId: str(data.userId),
    userName: str(data.userName, 'Athlete'),
    userEmail: str(data.userEmail),
    subject: str(data.subject, 'Support request'),
    category: (data.category as SupportCategory) || 'other',
    description: str(data.description),
    priority: (data.priority as SupportPriority) || 'medium',
    status: (data.status as SupportStatus) || 'open',
    assignedAdminId: str(data.assignedAdminId),
    assignedAdminName: str(data.assignedAdminName),
    messageCount: num(data.messageCount),
    createdAt: created,
    updatedAt: iso(data.updatedAt, created),
    lastMessageAt: iso(data.lastMessageAt, created),
    resolvedAt: isoOrNull(data.resolvedAt),
  }
}

function normaliseMessage(id: string, ticketId: string, data: DocumentData): SupportMessage {
  return {
    id,
    ticketId: str(data.ticketId, ticketId),
    senderId: str(data.senderId),
    senderName: str(data.senderName, data.senderRole === 'admin' ? 'Support team' : 'Athlete'),
    senderRole: data.senderRole === 'admin' ? 'admin' : 'user',
    message: str(data.message),
    createdAt: iso(data.createdAt),
  }
}

function normaliseNote(id: string, ticketId: string, data: DocumentData): SupportInternalNote {
  return {
    id,
    ticketId: str(data.ticketId, ticketId),
    adminId: str(data.adminId),
    adminName: str(data.adminName, 'Administrator'),
    note: str(data.note),
    createdAt: iso(data.createdAt),
  }
}

function normaliseNotification(id: string, data: DocumentData): AppNotification {
  return {
    id,
    userId: str(data.userId),
    title: str(data.title, 'Notification'),
    message: str(data.message),
    type: data.type === 'support' ? 'support' : data.type === 'workout' ? 'workout' : data.type === 'mission' ? 'mission' : 'system',
    relatedTicketId: typeof data.relatedTicketId === 'string' ? data.relatedTicketId : null,
    read: data.read === true,
    createdAt: iso(data.createdAt),
  }
}

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  const snapshot = await getDoc(doc(db(), ADMIN_USERS, uid))
  if (!snapshot.exists()) return null
  return normaliseAdmin(snapshot.id, snapshot.data())
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const snapshot = await getDocs(collection(db(), ADMIN_USERS))
  return snapshot.docs.map((item) => normaliseAdmin(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name))
}

export async function provisionAdmin(input: {
  uid: string
  email: string
  name: string
  role: AdminRole
}): Promise<void> {
  const ref = doc(db(), ADMIN_USERS, input.uid)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    await updateDoc(ref, {
      email: input.email,
      name: input.name,
      role: input.role,
      permissions: ROLE_PERMISSIONS[input.role],
      active: true,
      updatedAt: serverTimestamp(),
    })
    return
  }
  await setDoc(ref, {
    uid: input.uid,
    email: input.email,
    name: input.name,
    role: input.role,
    permissions: ROLE_PERMISSIONS[input.role],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateAdminRole(uid: string, role: AdminRole): Promise<void> {
  await updateDoc(doc(db(), ADMIN_USERS, uid), {
    role,
    permissions: ROLE_PERMISSIONS[role],
    updatedAt: serverTimestamp(),
  })
}

export async function setAdminActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db(), ADMIN_USERS, uid), {
    active,
    updatedAt: serverTimestamp(),
  })
}

export async function updateAdminProfile(
  uid: string,
  values: { name: string; lastLoginAt?: boolean },
): Promise<void> {
  await updateDoc(doc(db(), ADMIN_USERS, uid), {
    name: values.name,
    updatedAt: serverTimestamp(),
    ...(values.lastLoginAt ? { lastLoginAt: serverTimestamp() } : {}),
  })
}

export async function listAllUsers(): Promise<AdminUserSummary[]> {
  const snapshot = await getDocs(collection(db(), 'users'))
  return snapshot.docs
    .map((item) => normaliseUser(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export async function getAdminUserDetail(uid: string): Promise<AdminUserDetail> {
  const userSnap = await getDoc(doc(db(), 'users', uid))
  if (!userSnap.exists()) throw new Error('User not found.')
  const [workouts, measurements, missions, nutrition, aiSessions, tickets] = await Promise.all([
    getDocs(collection(db(), 'users', uid, 'workouts')),
    getDocs(collection(db(), 'users', uid, 'progress_records')),
    getDocs(collection(db(), 'users', uid, 'missions')),
    getDocs(collection(db(), 'users', uid, 'nutrition_logs')),
    getDocs(collection(db(), 'users', uid, 'ai_sessions')),
    getDocs(query(collection(db(), SUPPORT_TICKETS), where('userId', '==', uid))),
  ])
  return {
    user: normaliseUser(uid, userSnap.data()),
    workouts: workouts.docs
      .map((item) => {
        const data = item.data()
        return {
          id: item.id,
          title: str(data.title, 'Workout'),
          focus: str(data.focus),
          completedAt: iso(data.completedAt),
          durationSeconds: num(data.durationSeconds),
          exercisesCompleted: num(data.exercisesCompleted),
          totalExercises: num(data.totalExercises),
          source: str(data.source, 'plan'),
        }
      })
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    measurements: measurements.docs
      .map((item) => ({
        id: item.id,
        measuredAt: iso(item.data().measuredAt),
        weightKg: typeof item.data().weightKg === 'number' ? item.data().weightKg : null,
      }))
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    missions: missions.docs.map((item) => ({
      missionId: str(item.data().missionId, item.id),
      status: str(item.data().status, 'available'),
      completedAt: isoOrNull(item.data().completedAt),
    })),
    nutritionDays: nutrition.size,
    aiSessions: aiSessions.size,
    tickets: tickets.size,
  }
}

export async function updateUserAccount(
  uid: string,
  values: { fullName?: string; accountStatus?: 'active' | 'suspended'; adminNote?: string },
): Promise<void> {
  await setDoc(
    doc(db(), 'users', uid),
    clean({ ...values, updatedAt: serverTimestamp() }),
    { merge: true },
  )
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const snapshot = await getDocs(collection(db(), SUPPORT_TICKETS))
  return snapshot.docs
    .map((item) => normaliseTicket(item.id, item.data()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

export async function getUserTickets(uid: string): Promise<SupportTicket[]> {
  const snapshot = await getDocs(
    query(collection(db(), SUPPORT_TICKETS), where('userId', '==', uid)),
  )
  return snapshot.docs
    .map((item) => normaliseTicket(item.id, item.data()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const snapshot = await getDoc(doc(db(), SUPPORT_TICKETS, ticketId))
  if (!snapshot.exists()) return null
  return normaliseTicket(snapshot.id, snapshot.data())
}

export async function createTicket(input: {
  userId: string
  userName: string
  userEmail: string
  subject: string
  category: SupportCategory
  priority: SupportPriority
  description: string
}): Promise<SupportTicket> {
  const ref = doc(collection(db(), SUPPORT_TICKETS))
  const ticketId = `FRG-${ref.id.slice(-6).toUpperCase()}`
  const now = new Date().toISOString()
  await setDoc(ref, {
    ticketId,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    subject: input.subject.trim(),
    category: input.category,
    description: input.description.trim(),
    priority: input.priority,
    status: 'open',
    assignedAdminId: '',
    assignedAdminName: '',
    messageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    resolvedAt: null,
    schemaVersion: 1,
  })
  return {
    id: ref.id,
    ticketId,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    subject: input.subject.trim(),
    category: input.category,
    description: input.description.trim(),
    priority: input.priority,
    status: 'open',
    assignedAdminId: '',
    assignedAdminName: '',
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    resolvedAt: null,
  }
}

export async function getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const snapshot = await getDocs(collection(db(), SUPPORT_TICKETS, ticketId, 'messages'))
  return snapshot.docs
    .map((item) => normaliseMessage(item.id, ticketId, item.data()))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getAllSupportMessages(): Promise<SupportMessage[]> {
  const tickets = await getDocs(collection(db(), SUPPORT_TICKETS))
  const groups = await Promise.all(
    tickets.docs.map(async (ticket) => {
      const snapshot = await getDocs(collection(db(), SUPPORT_TICKETS, ticket.id, 'messages'))
      return snapshot.docs.map((item) => normaliseMessage(item.id, ticket.id, item.data()))
    }),
  )
  return groups.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addTicketMessage(input: {
  ticket: SupportTicket
  senderId: string
  senderName: string
  senderRole: 'user' | 'admin'
  message: string
  admin?: AdminUser
}): Promise<void> {
  const ticketRef = doc(db(), SUPPORT_TICKETS, input.ticket.id)
  await addDoc(collection(db(), SUPPORT_TICKETS, input.ticket.id, 'messages'), {
    ticketId: input.ticket.id,
    senderId: input.senderId,
    senderName: input.senderName,
    senderRole: input.senderRole,
    message: input.message.trim(),
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  })

  const update: Record<string, unknown> = {
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: increment(1),
  }
  if (input.senderRole === 'admin') {
    update.status = 'waiting_for_user'
    if (!input.ticket.assignedAdminId && input.admin) {
      update.assignedAdminId = input.admin.uid
      update.assignedAdminName = input.admin.name
    }
  } else if (input.ticket.status === 'waiting_for_user' || input.ticket.status === 'resolved') {
    update.status = 'open'
  }
  await updateDoc(ticketRef, update as { [key: string]: any })

  if (input.senderRole === 'admin') {
    await addDoc(collection(db(), NOTIFICATIONS), {
      userId: input.ticket.userId,
      title: `Support replied · ${input.ticket.ticketId}`,
      message: `Your ticket “${input.ticket.subject}” has a new response.`,
      type: 'support',
      relatedTicketId: input.ticket.id,
      read: false,
      createdAt: serverTimestamp(),
      schemaVersion: 1,
    })
  }
}

export async function updateTicket(
  ticketId: string,
  values: Partial<Pick<SupportTicket, 'status' | 'priority' | 'assignedAdminId' | 'assignedAdminName'>>,
  admin?: AdminUser,
): Promise<void> {
  const data: Record<string, unknown> = { ...values, updatedAt: serverTimestamp() }
  if (values.status === 'resolved') data.resolvedAt = serverTimestamp()
  if (values.status && values.status !== 'resolved') data.resolvedAt = null
  await updateDoc(doc(db(), SUPPORT_TICKETS, ticketId), data as { [key: string]: any })
  if (admin) {
    await logAdminActivity({
      adminId: admin.uid,
      adminName: admin.name,
      action: values.status ? 'ticket.status' : values.priority ? 'ticket.priority' : 'ticket.assign',
      targetType: 'support_ticket',
      targetId: ticketId,
      detail: JSON.stringify(values),
    })
  }
}

export async function getInternalNotes(ticketId: string): Promise<SupportInternalNote[]> {
  const snapshot = await getDocs(collection(db(), SUPPORT_TICKETS, ticketId, 'internal_notes'))
  return snapshot.docs
    .map((item) => normaliseNote(item.id, ticketId, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addInternalNote(input: {
  ticketId: string
  admin: AdminUser
  note: string
}): Promise<void> {
  await addDoc(collection(db(), SUPPORT_TICKETS, input.ticketId, 'internal_notes'), {
    ticketId: input.ticketId,
    adminId: input.admin.uid,
    adminName: input.admin.name,
    note: input.note.trim(),
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  })
  await logAdminActivity({
    adminId: input.admin.uid,
    adminName: input.admin.name,
    action: 'ticket.internal_note',
    targetType: 'support_ticket',
    targetId: input.ticketId,
    detail: 'Internal note added',
  })
}

export async function logAdminActivity(input: {
  adminId: string
  adminName: string
  action: string
  targetType: string
  targetId: string
  detail: string
}): Promise<void> {
  await addDoc(collection(db(), ACTIVITY_LOGS), {
    ...clean(input),
    createdAt: serverTimestamp(),
  })
}

export async function listNotifications(uid: string): Promise<AppNotification[]> {
  const snapshot = await getDocs(
    query(collection(db(), NOTIFICATIONS), where('userId', '==', uid), limit(50)),
  )
  return snapshot.docs
    .map((item) => normaliseNotification(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getAdminNotifications(): Promise<AppNotification[]> {
  const snapshot = await getDocs(query(collection(db(), NOTIFICATIONS), limit(100)))
  return snapshot.docs
    .map((item) => normaliseNotification(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function markNotificationRead(id: string, read = true): Promise<void> {
  await updateDoc(doc(db(), NOTIFICATIONS, id), { read })
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const items = await listNotifications(uid)
  const unread = items.filter((item) => !item.read)
  if (!unread.length) return
  const batch = writeBatch(db())
  unread.forEach((item) => batch.update(doc(db(), NOTIFICATIONS, item.id), { read: true }))
  await batch.commit()
}

export async function broadcastNotification(input: {
  title: string
  message: string
  type?: 'support' | 'system' | 'workout' | 'mission'
}): Promise<number> {
  const users = await getDocs(collection(db(), 'users'))
  let sent = 0
  const docs = users.docs
  for (let index = 0; index < docs.length; index += 400) {
    const batch = writeBatch(db())
    docs.slice(index, index + 400).forEach((user) => {
      const ref = doc(collection(db(), NOTIFICATIONS))
      batch.set(ref, {
        userId: user.id,
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type ?? 'system',
        relatedTicketId: null,
        read: false,
        createdAt: serverTimestamp(),
        schemaVersion: 1,
      })
      sent += 1
    })
    await batch.commit()
  }
  return sent
}

export async function getWorkoutPlans(): Promise<AdminWorkoutPlan[]> {
  return listContent<AdminWorkoutPlan>('workoutPlans')
}
export async function getExercises(): Promise<AdminExercise[]> {
  return listContent<AdminExercise>('exerciseLibrary')
}
export async function getNutritionPlans(): Promise<AdminNutritionPlan[]> {
  return listContent<AdminNutritionPlan>('nutritionPlans')
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  const errors: string[] = []
  async function safe<T>(task: Promise<T>, fallback: T, label: string): Promise<T> {
    try {
      return await task
    } catch (error) {
      errors.push(`${label}: ${(error as Error).message}`)
      return fallback
    }
  }

  const [users, workouts, missions, aiSessions, tickets, messages, nutrition] = await Promise.all([
    safe(listAllUsers(), [], 'Users'),
    safe(
      getDocs(collectionGroup(db(), 'workouts')).then((snapshot) =>
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            userId: str(data.userId),
            title: str(data.title, 'Workout'),
            focus: str(data.focus),
            completedAt: iso(data.completedAt),
            durationSeconds: num(data.durationSeconds),
            exercisesCompleted: num(data.exercisesCompleted),
            totalExercises: num(data.totalExercises),
          }
        }),
      ),
      [],
      'Workouts',
    ),
    safe(
      getDocs(collectionGroup(db(), 'missions')).then((snapshot) =>
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            userId: str(data.userId),
            missionId: str(data.missionId, item.id),
            status: str(data.status, 'available'),
            completedAt: isoOrNull(data.completedAt),
          }
        }),
      ),
      [],
      'Missions',
    ),
    safe(
      getDocs(collectionGroup(db(), 'ai_sessions')).then((snapshot) =>
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            userId: str(data.userId),
            exercise: str(data.exercise, 'squat'),
            exerciseLabel: str(data.exerciseLabel, 'Exercise'),
            completedAt: iso(data.completedAt),
            reps: num(data.reps),
            averageFormScore:
              typeof data.averageFormScore === 'number' ? data.averageFormScore : null,
            verdict: str(data.verdict, 'insufficient-data'),
          }
        }),
      ),
      [],
      'AI sessions',
    ),
    safe(getAllTickets(), [], 'Support tickets'),
    safe(getAllSupportMessages(), [], 'Support messages'),
    safe(
      getDocs(collectionGroup(db(), 'nutrition_logs')).then((snapshot) => snapshot.size),
      0,
      'Nutrition logs',
    ),
  ])

  return { users, workouts, missions, aiSessions, nutritionDays: nutrition, tickets, messages, errors }
}

export async function listContent<T>(name: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db(), name))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as T))
    .sort((a, b) =>
      String((b as { createdAt?: string }).createdAt ?? '').localeCompare(
        String((a as { createdAt?: string }).createdAt ?? ''),
      ),
    )
}

export async function saveContent(
  name: string,
  id: string,
  values: Record<string, unknown>,
): Promise<string> {
  const ref = id ? doc(db(), name, id) : doc(collection(db(), name))
  const existing = await getDoc(ref)
  await setDoc(
    ref,
    {
      ...clean(values),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return ref.id
}

export async function deleteContent(name: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), name, id))
}

export async function getMissionSettings(): Promise<Record<string, boolean>> {
  const snapshot = await getDocs(collection(db(), 'missionSettings'))
  const settings: Record<string, boolean> = {}
  snapshot.forEach((item) => {
    settings[item.id] = item.data().enabled !== false
  })
  return settings
}

export async function setMissionEnabled(missionId: string, enabled: boolean): Promise<void> {
  await setDoc(
    doc(db(), 'missionSettings', missionId),
    { enabled, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  const snapshot = await getDoc(doc(db(), 'platformSettings', 'main'))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    supportEmail: str(data.supportEmail, ''),
    supportSlaHours: num(data.supportSlaHours, 24),
    maintenanceMessage: str(data.maintenanceMessage),
    updatedAt: iso(data.updatedAt),
  }
}

export async function savePlatformSettings(values: PlatformSettings): Promise<void> {
  await setDoc(
    doc(db(), 'platformSettings', 'main'),
    { ...values, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export async function reopenTicket(ticketId: string): Promise<void> {
  await updateDoc(doc(db(), SUPPORT_TICKETS, ticketId), {
    status: 'open',
    updatedAt: serverTimestamp(),
  })
}
