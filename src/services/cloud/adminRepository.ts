import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '../../lib/firestore'
import { ROLE_PERMISSIONS } from '../../types/admin'
import type {
  AdminActivityLog,
  AdminExercise,
  AdminNutritionPlan,
  AdminOverview,
  AdminRole,
  AdminSnapshot,
  AdminUser,
  AdminUserDetail,
  AdminUserSummary,
  AdminWorkoutPlan,
  Announcement,
  AnnouncementStatus,
  AnnouncementTone,
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
const ANNOUNCEMENTS = 'announcements'
const ADMIN_PAGE_SIZE = 12
const TICKET_SCAN_LIMIT = 500
const SEARCH_LIMIT = 20

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
    suspensionReason:
      typeof data.suspensionReason === 'string' && data.suspensionReason.trim()
        ? data.suspensionReason
        : null,
    suspendedAt: data.suspendedAt ? iso(data.suspendedAt) : null,
    suspendedByName:
      typeof data.suspendedByName === 'string' && data.suspendedByName.trim()
        ? data.suspendedByName
        : null,
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

function normaliseAnnouncement(id: string, data: DocumentData): Announcement {
  return {
    id,
    title: str(data.title, 'Announcement'),
    body: str(data.body),
    status:
      data.status === 'published'
        ? 'published'
        : data.status === 'archived'
          ? 'archived'
          : 'draft',
    tone:
      data.tone === 'maintenance'
        ? 'maintenance'
        : data.tone === 'update'
          ? 'update'
          : 'info',
    createdBy: str(data.createdBy),
    createdByName: str(data.createdByName, 'Administrator'),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    publishedAt: isoOrNull(data.publishedAt),
  }
}

function normaliseActivity(id: string, data: DocumentData): AdminActivityLog {
  return {
    id,
    adminId: str(data.adminId),
    adminName: str(data.adminName, 'Administrator'),
    action: str(data.action, 'admin.action'),
    targetType: str(data.targetType),
    targetId: str(data.targetId),
    detail: str(data.detail),
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
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
      uid: input.uid,
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
    uid,
    role,
    permissions: ROLE_PERMISSIONS[role],
    updatedAt: serverTimestamp(),
  })
}

export async function setAdminActive(uid: string, active: boolean): Promise<void> {
  const snapshot = await getDoc(doc(db(), ADMIN_USERS, uid))
  const existing = snapshot.data()
  await updateDoc(doc(db(), ADMIN_USERS, uid), {
    uid,
    role: existing?.role ?? 'analyst',
    permissions: Array.isArray(existing?.permissions) ? existing.permissions : [],
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
  const snapshot = await getDocs(query(collection(db(), 'users'), limit(500)))
  return snapshot.docs
    .map((item) => normaliseUser(item.id, item.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface AdminUserPage {
  users: AdminUserSummary[]
  total: number
  hasMore: boolean
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
}

export interface AdminUserStats {
  total: number
  active: number
  suspended: number
  missingProfiles: number
}

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const users = collection(db(), 'users')
  const [total, suspended, completedProfiles] = await Promise.all([
    getCountFromServer(users),
    getCountFromServer(query(users, where('accountStatus', '==', 'suspended'))),
    getCountFromServer(query(users, where('profileCompletedAt', '!=', null))),
  ])
  const totalCount = total.data().count
  const suspendedCount = suspended.data().count
  return {
    total: totalCount,
    active: totalCount - suspendedCount,
    suspended: suspendedCount,
    missingProfiles: Math.max(0, totalCount - completedProfiles.data().count),
  }
}

export async function listAdminUsersPage(input: {
  pageSize?: number
  cursor?: QueryDocumentSnapshot<DocumentData> | null
  status?: 'all' | 'active' | 'suspended'
  since?: Date | null
}): Promise<AdminUserPage> {
  const pageSize = input.pageSize ?? ADMIN_PAGE_SIZE
  const conditions: QueryConstraint[] = []
  if (input.status === 'active') conditions.push(where('accountStatus', '==', 'active'))
  if (input.status === 'suspended') conditions.push(where('accountStatus', '==', 'suspended'))
  if (input.since) conditions.push(where('createdAt', '>=', Timestamp.fromDate(input.since)))

  const base = query(collection(db(), 'users'), ...conditions, orderBy('createdAt', 'desc'))
  const total = await getCountFromServer(base)
  const pageQuery = query(
    base,
    ...(input.cursor ? [startAfter(input.cursor)] : []),
    limit(pageSize + 1),
  )
  const snapshot = await getDocs(pageQuery)
  const hasMore = snapshot.docs.length > pageSize
  const docs = snapshot.docs.slice(0, pageSize)

  return {
    users: docs.map((item) => normaliseUser(item.id, item.data())),
    total: total.data().count,
    hasMore,
    nextCursor: hasMore ? docs[docs.length - 1] ?? null : null,
  }
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (part) => part.toUpperCase())
}

async function userPrefixQuery(field: 'fullName' | 'email', needle: string) {
  const snapshot = await getDocs(
    query(
      collection(db(), 'users'),
      where(field, '>=', needle),
      where(field, '<=', `${needle}\uf8ff`),
      limit(SEARCH_LIMIT),
    ),
  )
  return snapshot.docs.map((item) => normaliseUser(item.id, item.data()))
}

export async function searchAdminUsers(input: {
  search: string
  status?: 'all' | 'active' | 'suspended'
  since?: Date | null
}): Promise<{ users: AdminUserSummary[]; capped: boolean }> {
  const needle = input.search.trim()
  if (!needle) return { users: [], capped: false }
  const results = new Map<string, AdminUserSummary>()
  const add = (items: AdminUserSummary[]) => items.forEach((item) => results.set(item.uid, item))

  if (needle.length >= 20 && !needle.includes(' ')) {
    const direct = await getDoc(doc(db(), 'users', needle))
    if (direct.exists()) add([normaliseUser(direct.id, direct.data())])
  }

  if (needle.includes('@')) {
    add(await userPrefixQuery('email', needle.toLowerCase()))
  } else {
    for (const variant of new Set([needle, titleCase(needle), needle.toUpperCase()])) {
      add(await userPrefixQuery('fullName', variant))
    }
  }

  const sinceMs = input.since ? input.since.getTime() : null
  const filtered = [...results.values()]
    .filter((user) => input.status === 'all' || !input.status || user.accountStatus === input.status)
    .filter((user) => sinceMs === null || new Date(user.createdAt).getTime() >= sinceMs)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { users: filtered.slice(0, 50), capped: filtered.length > 50 }
}

export async function getAdminUserDetail(uid: string): Promise<AdminUserDetail> {
  const userSnap = await getDoc(doc(db(), 'users', uid))
  if (!userSnap.exists()) throw new Error('User not found.')

  const workoutsRef = collection(db(), 'users', uid, 'workouts')
  const measurementsRef = collection(db(), 'users', uid, 'progress_records')
  const nutritionRef = collection(db(), 'users', uid, 'nutrition_logs')
  const aiRef = collection(db(), 'users', uid, 'ai_sessions')
  const missionsRef = collection(db(), 'users', uid, 'missions')
  const ticketsRef = collection(db(), SUPPORT_TICKETS)

  const [
    workouts,
    measurements,
    missions,
    tickets,
    nutrition,
    workoutCount,
    measurementCount,
    nutritionCount,
    aiCount,
    ticketCount,
  ] = await Promise.all([
    getDocs(query(workoutsRef, orderBy('completedAt', 'desc'), limit(20))),
    getDocs(query(measurementsRef, orderBy('measuredAt', 'desc'), limit(20))),
    getDocs(missionsRef),
    getDocs(
      query(
        ticketsRef,
        where('userId', '==', uid),
        orderBy('lastMessageAt', 'desc'),
        limit(5),
      ),
    ),
    getDocs(query(nutritionRef, orderBy('date', 'desc'), limit(7))),
    getCountFromServer(workoutsRef),
    getCountFromServer(measurementsRef),
    getCountFromServer(nutritionRef),
    getCountFromServer(aiRef),
    getCountFromServer(query(ticketsRef, where('userId', '==', uid))),
  ])

  return {
    user: normaliseUser(uid, userSnap.data()),
    workouts: workouts.docs.map((item) => {
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
    }),
    measurements: measurements.docs.map((item) => ({
      id: item.id,
      measuredAt: iso(item.data().measuredAt),
      weightKg: typeof item.data().weightKg === 'number' ? item.data().weightKg : null,
    })),
    missions: missions.docs.map((item) => ({
      missionId: str(item.data().missionId, item.id),
      status: str(item.data().status, 'available'),
      completedAt: isoOrNull(item.data().completedAt),
    })),
    workoutCount: workoutCount.data().count,
    measurementCount: measurementCount.data().count,
    nutritionDays: nutritionCount.data().count,
    aiSessions: aiCount.data().count,
    ticketCount: ticketCount.data().count,
    recentTickets: tickets.docs.map((item) => normaliseTicket(item.id, item.data())),
    recentNutrition: nutrition.docs.map((item) => {
      const data = item.data()
      const totals =
        data.totals && typeof data.totals === 'object'
          ? (data.totals as Record<string, unknown>)
          : {}
      return {
        id: item.id,
        date: str(data.date, item.id),
        calories: num(totals.calories),
        protein: num(totals.protein),
        carbs: num(totals.carbs),
        fat: num(totals.fat),
        mealCount: Array.isArray(data.meals) ? data.meals.length : 0,
      }
    }),
  }
}

export async function updateUserAccount(
  uid: string,
  values: {
    fullName?: string
    accountStatus?: 'active' | 'suspended'
    adminNote?: string
    suspensionReason?: string | null
    suspendedAt?: Timestamp | null
    suspendedBy?: string | null
    suspendedByName?: string | null
  },
): Promise<void> {
  await setDoc(
    doc(db(), 'users', uid),
    clean({ ...values, updatedAt: serverTimestamp() }),
    { merge: true },
  )
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const snapshot = await getDocs(query(collection(db(), SUPPORT_TICKETS), limit(500)))
  return snapshot.docs
    .map((item) => normaliseTicket(item.id, item.data()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

export interface AdminTicketQueue {
  tickets: SupportTicket[]
  total: number
  hasMore: boolean
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
  mode: 'paged' | 'bounded'
}

export interface AdminTicketStats {
  total: number
  open: number
  inProgress: number
  waiting: number
  resolved: number
  urgent: number
}

export async function getSupportTicketStats(): Promise<AdminTicketStats> {
  const tickets = collection(db(), SUPPORT_TICKETS)
  const [total, open, inProgress, waiting, resolved, closed, urgent] = await Promise.all([
    getCountFromServer(tickets),
    getCountFromServer(query(tickets, where('status', '==', 'open'))),
    getCountFromServer(query(tickets, where('status', '==', 'in_progress'))),
    getCountFromServer(query(tickets, where('status', '==', 'waiting_for_user'))),
    getCountFromServer(query(tickets, where('status', '==', 'resolved'))),
    getCountFromServer(query(tickets, where('status', '==', 'closed'))),
    getCountFromServer(query(tickets, where('priority', '==', 'urgent'))),
  ])
  return {
    total: total.data().count,
    open: open.data().count,
    inProgress: inProgress.data().count,
    waiting: waiting.data().count,
    resolved: resolved.data().count + closed.data().count,
    urgent: urgent.data().count,
  }
}

export async function listSupportTicketsPage(input: {
  pageSize?: number
  cursor?: QueryDocumentSnapshot<DocumentData> | null
  status?: SupportStatus | 'all'
  priority?: SupportPriority | 'all'
  category?: SupportCategory | 'all'
  assignee?: 'all' | 'unassigned'
}): Promise<AdminTicketQueue> {
  const pageSize = input.pageSize ?? ADMIN_PAGE_SIZE
  const hasAdvancedFilters =
    (input.priority && input.priority !== 'all') ||
    (input.category && input.category !== 'all') ||
    input.assignee === 'unassigned'

  if (hasAdvancedFilters) {
    const conditions: QueryConstraint[] = []
    if (input.status && input.status !== 'all') conditions.push(where('status', '==', input.status))
    if (input.priority && input.priority !== 'all') {
      conditions.push(where('priority', '==', input.priority))
    }
    if (input.category && input.category !== 'all') {
      conditions.push(where('category', '==', input.category))
    }
    if (input.assignee === 'unassigned') conditions.push(where('assignedAdminId', '==', ''))
    const snapshot = await getDocs(
      query(collection(db(), SUPPORT_TICKETS), ...conditions, limit(TICKET_SCAN_LIMIT)),
    )
    const tickets = snapshot.docs
      .map((item) => normaliseTicket(item.id, item.data()))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    return {
      tickets,
      total: tickets.length,
      hasMore: false,
      nextCursor: null,
      mode: 'bounded',
    }
  }

  const conditions: QueryConstraint[] = []
  if (input.status && input.status !== 'all') conditions.push(where('status', '==', input.status))
  const base = query(
    collection(db(), SUPPORT_TICKETS),
    ...conditions,
    orderBy('lastMessageAt', 'desc'),
  )
  const total = await getCountFromServer(base)
  const snapshot = await getDocs(
    query(
      base,
      ...(input.cursor ? [startAfter(input.cursor)] : []),
      limit(pageSize + 1),
    ),
  )
  const hasMore = snapshot.docs.length > pageSize
  const docs = snapshot.docs.slice(0, pageSize)
  return {
    tickets: docs.map((item) => normaliseTicket(item.id, item.data())),
    total: total.data().count,
    hasMore,
    nextCursor: hasMore ? docs[docs.length - 1] ?? null : null,
    mode: 'paged',
  }
}

async function ticketPrefixQuery(
  field: 'ticketId' | 'userEmail' | 'userName' | 'subject',
  needle: string,
) {
  const snapshot = await getDocs(
    query(
      collection(db(), SUPPORT_TICKETS),
      where(field, '>=', needle),
      where(field, '<=', `${needle}\uf8ff`),
      limit(25),
    ),
  )
  return snapshot.docs.map((item) => normaliseTicket(item.id, item.data()))
}

export async function searchSupportTickets(input: {
  search: string
  status?: SupportStatus | 'all'
  priority?: SupportPriority | 'all'
  category?: SupportCategory | 'all'
  assignee?: 'all' | 'unassigned'
}): Promise<{ tickets: SupportTicket[]; capped: boolean }> {
  const needle = input.search.trim()
  if (!needle) return { tickets: [], capped: false }
  const results = new Map<string, SupportTicket>()
  const add = (items: SupportTicket[]) => items.forEach((item) => results.set(item.id, item))

  add(await ticketPrefixQuery('ticketId', needle.toUpperCase()))
  add(await ticketPrefixQuery('subject', needle))
  add(await ticketPrefixQuery('subject', titleCase(needle)))
  if (needle.includes('@')) {
    add(await ticketPrefixQuery('userEmail', needle.toLowerCase()))
  } else {
    for (const variant of new Set([needle, titleCase(needle), needle.toUpperCase()])) {
      add(await ticketPrefixQuery('userName', variant))
    }
  }

  const filtered = [...results.values()]
    .filter((ticket) => input.status === 'all' || !input.status || ticket.status === input.status)
    .filter((ticket) => input.priority === 'all' || !input.priority || ticket.priority === input.priority)
    .filter((ticket) => input.category === 'all' || !input.category || ticket.category === input.category)
    .filter((ticket) => input.assignee !== 'unassigned' || !ticket.assignedAdminId)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))

  return { tickets: filtered.slice(0, 50), capped: filtered.length > 50 }
}

export async function getUserTickets(uid: string): Promise<SupportTicket[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), SUPPORT_TICKETS),
      where('userId', '==', uid),
      orderBy('lastMessageAt', 'desc'),
      limit(100),
    ),
  )
  return snapshot.docs.map((item) => normaliseTicket(item.id, item.data()))
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
  const snapshot = await getDocs(
    query(
      collection(db(), SUPPORT_TICKETS, ticketId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(200),
    ),
  )
  return snapshot.docs
    .map((item) => normaliseMessage(item.id, ticketId, item.data()))
    .reverse()
}

export async function getAllSupportMessages(): Promise<SupportMessage[]> {
  const tickets = await getDocs(query(collection(db(), SUPPORT_TICKETS), limit(200)))
  const groups = await Promise.all(
    tickets.docs.map(async (ticket) => {
      const snapshot = await getDocs(
        query(
          collection(db(), SUPPORT_TICKETS, ticket.id, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(50),
        ),
      )
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
    if (input.admin) {
      await logAdminActivity({
        adminId: input.admin.uid,
        adminName: input.admin.name,
        action: 'ticket.reply',
        targetType: 'support_ticket',
        targetId: input.ticket.id,
        detail: `Reply sent on ${input.ticket.ticketId}`,
        metadata: { status: 'waiting_for_user' },
      })
    }
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
  const snapshot = await getDocs(
    query(
      collection(db(), SUPPORT_TICKETS, ticketId, 'internal_notes'),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  )
  return snapshot.docs.map((item) => normaliseNote(item.id, ticketId, item.data()))
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
  metadata?: Record<string, unknown>
}): Promise<void> {
  await addDoc(collection(db(), ACTIVITY_LOGS), {
    ...clean(input),
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  })
}

export interface AdminActivityPage {
  logs: AdminActivityLog[]
  total: number
  hasMore: boolean
  nextCursor: QueryDocumentSnapshot<DocumentData> | null
}

export async function listAdminActivity(input: {
  pageSize?: number
  cursor?: QueryDocumentSnapshot<DocumentData> | null
  action?: string
}): Promise<AdminActivityPage> {
  const pageSize = input.pageSize ?? 25
  const conditions: QueryConstraint[] = []
  if (input.action && input.action !== 'all') conditions.push(where('action', '==', input.action))
  const base = query(
    collection(db(), ACTIVITY_LOGS),
    ...conditions,
    orderBy('createdAt', 'desc'),
  )
  const total = await getCountFromServer(base)
  const snapshot = await getDocs(
    query(
      base,
      ...(input.cursor ? [startAfter(input.cursor)] : []),
      limit(pageSize + 1),
    ),
  )
  const hasMore = snapshot.docs.length > pageSize
  const docs = snapshot.docs.slice(0, pageSize)
  return {
    logs: docs.map((item) => normaliseActivity(item.id, item.data())),
    total: total.data().count,
    hasMore,
    nextCursor: hasMore ? docs[docs.length - 1] ?? null : null,
  }
}

export async function listAdminActivityRecent(limitCount = 8): Promise<AdminActivityLog[]> {
  const snapshot = await getDocs(
    query(collection(db(), ACTIVITY_LOGS), orderBy('createdAt', 'desc'), limit(limitCount)),
  )
  return snapshot.docs.map((item) => normaliseActivity(item.id, item.data()))
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

export async function listAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(collection(db(), ANNOUNCEMENTS), orderBy('updatedAt', 'desc'), limit(100)),
  )
  return snapshot.docs.map((item) => normaliseAnnouncement(item.id, item.data()))
}

export async function getPublishedAnnouncements(limitCount = 3): Promise<Announcement[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), ANNOUNCEMENTS),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(limitCount),
    ),
  )
  return snapshot.docs.map((item) => normaliseAnnouncement(item.id, item.data()))
}

export async function saveAnnouncement(input: {
  id?: string
  title: string
  body: string
  tone: AnnouncementTone
  status: AnnouncementStatus
  admin: AdminUser
}): Promise<string> {
  const ref = input.id
    ? doc(db(), ANNOUNCEMENTS, input.id)
    : doc(collection(db(), ANNOUNCEMENTS))
  const existing = input.id ? await getDoc(ref) : null
  const wasPublished = existing?.data()?.status === 'published'
  await setDoc(
    ref,
    {
      title: input.title.trim(),
      body: input.body.trim(),
      tone: input.tone,
      status: input.status,
      createdBy: existing?.data()?.createdBy ?? input.admin.uid,
      createdByName: existing?.data()?.createdByName ?? input.admin.name,
      ...(existing?.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
      publishedAt:
        input.status === 'published'
          ? wasPublished && existing?.data()?.publishedAt
            ? existing.data()?.publishedAt
            : serverTimestamp()
          : null,
      schemaVersion: 1,
    },
    { merge: true },
  )
  await logAdminActivity({
    adminId: input.admin.uid,
    adminName: input.admin.name,
    action: input.id ? 'announcement.update' : 'announcement.create',
    targetType: 'announcement',
    targetId: ref.id,
    detail: `${input.title.trim()} · ${input.status}`,
    metadata: { status: input.status, tone: input.tone },
  })
  return ref.id
}

export async function setAnnouncementPublished(
  id: string,
  published: boolean,
  admin: AdminUser,
): Promise<void> {
  await updateDoc(doc(db(), ANNOUNCEMENTS, id), {
    status: published ? 'published' : 'draft',
    publishedAt: published ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
  await logAdminActivity({
    adminId: admin.uid,
    adminName: admin.name,
    action: published ? 'announcement.publish' : 'announcement.unpublish',
    targetType: 'announcement',
    targetId: id,
    detail: published ? 'Announcement published' : 'Announcement unpublished',
    metadata: { status: published ? 'published' : 'draft' },
  })
}

export async function deleteAnnouncement(id: string, admin: AdminUser): Promise<void> {
  await deleteDoc(doc(db(), ANNOUNCEMENTS, id))
  await logAdminActivity({
    adminId: admin.uid,
    adminName: admin.name,
    action: 'announcement.delete',
    targetType: 'announcement',
    targetId: id,
    detail: 'Announcement deleted',
  })
}

export async function getWorkoutPlans(): Promise<AdminWorkoutPlan[]> {
  return listContent<AdminWorkoutPlan>('workoutPlans')
}

export async function getPublishedWorkoutPlans(): Promise<AdminWorkoutPlan[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), 'workoutPlans'),
      where('status', '==', 'published'),
      limit(60),
    ),
  )
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminWorkoutPlan))
}

export async function getPublishedNutritionPlans(): Promise<AdminNutritionPlan[]> {
  const snapshot = await getDocs(
    query(
      collection(db(), 'nutritionPlans'),
      where('status', '==', 'published'),
      limit(60),
    ),
  )
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminNutritionPlan))
}

export async function getMemberExerciseLibrary(): Promise<AdminExercise[]> {
  const snapshot = await getDocs(query(collection(db(), 'exerciseLibrary'), limit(200)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminExercise))
}
export async function getExercises(): Promise<AdminExercise[]> {
  return listContent<AdminExercise>('exerciseLibrary')
}
export async function getNutritionPlans(): Promise<AdminNutritionPlan[]> {
  return listContent<AdminNutritionPlan>('nutritionPlans')
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const errors: string[] = []
  const bounded: string[] = []
  async function safe<T>(task: Promise<T>, fallback: T, label: string): Promise<T> {
    try {
      return await task
    } catch (error) {
      errors.push(`${label}: ${(error as Error).message}`)
      return fallback
    }
  }
  const count = async (target: Parameters<typeof getCountFromServer>[0], label: string) => {
    const result = await safe(getCountFromServer(target), null, label)
    return result?.data().count ?? 0
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const cutoff = thirtyDaysAgo.toISOString()
  const activityLimit = 2000

  const [
    users,
    suspendedUsers,
    newUsers,
    workouts,
    missions,
    aiSessions,
    nutritionDays,
    tickets,
    openTickets,
    inProgressTickets,
    waitingTickets,
    resolvedTickets,
    closedTickets,
  ] = await Promise.all([
    count(collection(db(), 'users'), 'Users'),
    count(query(collection(db(), 'users'), where('accountStatus', '==', 'suspended')), 'Suspended users'),
    count(
      query(collection(db(), 'users'), where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))),
      'New users',
    ),
    count(collectionGroup(db(), 'workouts'), 'Workouts'),
    count(collectionGroup(db(), 'missions'), 'Missions'),
    count(collectionGroup(db(), 'ai_sessions'), 'AI sessions'),
    count(collectionGroup(db(), 'nutrition_logs'), 'Nutrition logs'),
    count(collection(db(), SUPPORT_TICKETS), 'Tickets'),
    count(query(collection(db(), SUPPORT_TICKETS), where('status', '==', 'open')), 'Open tickets'),
    count(query(collection(db(), SUPPORT_TICKETS), where('status', '==', 'in_progress')), 'In-progress tickets'),
    count(query(collection(db(), SUPPORT_TICKETS), where('status', '==', 'waiting_for_user')), 'Waiting tickets'),
    count(query(collection(db(), SUPPORT_TICKETS), where('status', '==', 'resolved')), 'Resolved tickets'),
    count(query(collection(db(), SUPPORT_TICKETS), where('status', '==', 'closed')), 'Closed tickets'),
  ])

  const activeSets = await Promise.all([
    safe(
      getDocs(
        query(
          collectionGroup(db(), 'workouts'),
          where('completedAt', '>=', cutoff),
          limit(activityLimit),
        ),
      ).then((snapshot) => {
        if (snapshot.size >= activityLimit) bounded.push(`Active users: first ${activityLimit} workouts`)
        return new Set(snapshot.docs.map((item) => str(item.data().userId)).filter(Boolean))
      }),
      new Set<string>(),
      'Workout activity',
    ),
    safe(
      getDocs(
        query(
          collectionGroup(db(), 'ai_sessions'),
          where('completedAt', '>=', cutoff),
          limit(activityLimit),
        ),
      ).then((snapshot) => {
        if (snapshot.size >= activityLimit) bounded.push(`Active users: first ${activityLimit} AI sessions`)
        return new Set(snapshot.docs.map((item) => str(item.data().userId)).filter(Boolean))
      }),
      new Set<string>(),
      'AI activity',
    ),
    safe(
      getDocs(
        query(
          collectionGroup(db(), 'missions'),
          where('completedAt', '>=', cutoff),
          limit(activityLimit),
        ),
      ).then((snapshot) => {
        if (snapshot.size >= activityLimit) bounded.push(`Active users: first ${activityLimit} missions`)
        return new Set(snapshot.docs.map((item) => str(item.data().userId)).filter(Boolean))
      }),
      new Set<string>(),
      'Mission activity',
    ),
  ])
  const activeUsers = new Set(activeSets.flatMap((set) => [...set])).size

  const registrationTrend = await Promise.all(
    Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1)
      return safe(
        getCountFromServer(
          query(
            collection(db(), 'users'),
            where('createdAt', '>=', Timestamp.fromDate(start)),
            where('createdAt', '<', Timestamp.fromDate(end)),
          ),
        ).then((result) => result.data().count),
        0,
        'Registration trend',
      ).then((value) => ({
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        label: start.toLocaleDateString('en-GB', { month: 'short' }),
        count: value,
      }))
    }),
  )

  const [recentWorkoutDocs, recentAiDocs, recentUsers, recentTickets, recentAdminActivity] =
    await Promise.all([
      safe(
        getDocs(
          query(
            collectionGroup(db(), 'workouts'),
            where('completedAt', '>=', new Date(now.getTime() - 7 * 86400000).toISOString()),
            orderBy('completedAt', 'desc'),
            limit(1000),
          ),
        ),
        null,
        'Recent workouts',
      ),
      safe(
        getDocs(
          query(
            collectionGroup(db(), 'ai_sessions'),
            where('completedAt', '>=', new Date(now.getTime() - 7 * 86400000).toISOString()),
            orderBy('completedAt', 'desc'),
            limit(1000),
          ),
        ),
        null,
        'Recent AI sessions',
      ),
      safe(
        getDocs(query(collection(db(), 'users'), orderBy('createdAt', 'desc'), limit(4))),
        null,
        'Recent registrations',
      ),
      safe(
        getDocs(
          query(collection(db(), SUPPORT_TICKETS), orderBy('lastMessageAt', 'desc'), limit(4)),
        ),
        null,
        'Recent tickets',
      ),
      safe(listAdminActivityRecent(8), [], 'Admin activity'),
    ])

  const workoutDocs = recentWorkoutDocs?.docs ?? []
  const aiDocs = recentAiDocs?.docs ?? []
  if (recentWorkoutDocs?.size === 1000) bounded.push('Activity trend: first 1000 workouts')
  if (recentAiDocs?.size === 1000) bounded.push('Activity trend: first 1000 AI sessions')

  const activityTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - index))
    const key = date.toISOString().slice(0, 10)
    return {
      key,
      label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      workouts: workoutDocs.filter((item) => str(item.data().completedAt).slice(0, 10) === key).length,
      ai: aiDocs.filter((item) => str(item.data().completedAt).slice(0, 10) === key).length,
    }
  })

  const exerciseCounts = new Map<string, number>()
  aiDocs.forEach((item) => {
    const label = str(item.data().exerciseLabel, 'Exercise')
    exerciseCounts.set(label, (exerciseCounts.get(label) ?? 0) + 1)
  })
  const exerciseMix = [...exerciseCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    counts: {
      users,
      suspendedUsers,
      activeUsers,
      newUsers,
      workouts,
      missions,
      aiSessions,
      nutritionDays,
      tickets,
      openTickets: openTickets + inProgressTickets + waitingTickets,
      resolvedTickets: resolvedTickets + closedTickets,
    },
    registrationTrend,
    activityTrend,
    ticketBreakdown: [
      { status: 'open', count: openTickets },
      { status: 'in_progress', count: inProgressTickets },
      { status: 'waiting_for_user', count: waitingTickets },
      { status: 'resolved', count: resolvedTickets },
      { status: 'closed', count: closedTickets },
    ],
    exerciseMix,
    recentUsers: (recentUsers?.docs ?? []).map((item) => normaliseUser(item.id, item.data())),
    recentWorkouts: workoutDocs.slice(0, 4).map((item) => ({
      id: item.id,
      userId: str(item.data().userId),
      title: str(item.data().title, 'Workout'),
      completedAt: iso(item.data().completedAt),
      exercisesCompleted: num(item.data().exercisesCompleted),
      totalExercises: num(item.data().totalExercises),
    })),
    recentTickets: (recentTickets?.docs ?? []).map((item) =>
      normaliseTicket(item.id, item.data()),
    ),
    recentAdminActivity,
    errors,
    bounded,
  }
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
    safe(
      listAllUsers().then((items) => {
        if (items.length === 500) errors.push('Users: showing first 500 records')
        return items
      }),
      [],
      'Users',
    ),
    safe(
      getDocs(query(collectionGroup(db(), 'workouts'), limit(2000))).then((snapshot) => {
        if (snapshot.size === 2000) errors.push('Workouts: showing first 2000 records')
        return snapshot.docs.map((item) => {
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
        })
      }),
      [],
      'Workouts',
    ),
    safe(
      getDocs(query(collectionGroup(db(), 'missions'), limit(2000))).then((snapshot) => {
        if (snapshot.size === 2000) errors.push('Missions: showing first 2000 records')
        return snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            userId: str(data.userId),
            missionId: str(data.missionId, item.id),
            status: str(data.status, 'available'),
            completedAt: isoOrNull(data.completedAt),
          }
        })
      }),
      [],
      'Missions',
    ),
    safe(
      getDocs(query(collectionGroup(db(), 'ai_sessions'), limit(2000))).then((snapshot) => {
        if (snapshot.size === 2000) errors.push('AI sessions: showing first 2000 records')
        return snapshot.docs.map((item) => {
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
        })
      }),
      [],
      'AI sessions',
    ),
    safe(getAllTickets(), [], 'Support tickets'),
    safe(getAllSupportMessages(), [], 'Support messages'),
    safe(
      getCountFromServer(collectionGroup(db(), 'nutrition_logs')).then((snapshot) => snapshot.data().count),
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
