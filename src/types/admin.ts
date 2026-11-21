export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'fitness_manager'
  | 'support_manager'
  | 'analyst'

export type AdminPermission =
  | 'manage_users'
  | 'manage_roles'
  | 'manage_content'
  | 'manage_support'
  | 'view_analytics'
  | 'manage_ai'
  | 'manage_platform'

export interface AdminUser {
  uid: string
  email: string
  name: string
  role: AdminRole
  permissions: AdminPermission[]
  active: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export type AccountStatus = 'active' | 'suspended'

export interface AdminUserSummary {
  uid: string
  fullName: string
  email: string
  photoURL: string | null
  avatarUrl: string | null
  accountStatus: AccountStatus
  goal: string | null
  experience: string | null
  createdAt: string
  updatedAt: string
  profileCompletedAt: string | null
}

export interface AdminUserDetail {
  user: AdminUserSummary
  workouts: Array<{
    id: string
    title: string
    focus: string
    completedAt: string
    durationSeconds: number
    exercisesCompleted: number
    totalExercises: number
    source: string
  }>
  measurements: Array<{ id: string; measuredAt: string; weightKg: number | null }>
  missions: Array<{ missionId: string; status: string; completedAt: string | null }>
  nutritionDays: number
  aiSessions: number
  tickets: number
}

export interface AdminActivityLog {
  id: string
  adminId: string
  adminName: string
  action: string
  targetType: string
  targetId: string
  detail: string
  createdAt: string
}

export interface AdminWorkoutPlan {
  id: string
  title: string
  focus: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationMinutes: number
  daysPerWeek: number
  description: string
  exercises: string
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface AdminExercise {
  id: string
  name: string
  muscleGroups: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructions: string
  aiSupported: boolean
  repCounting: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminNutritionPlan {
  id: string
  name: string
  goal: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes: string
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface PlatformSettings {
  supportEmail: string
  supportSlaHours: number
  maintenanceMessage: string
  updatedAt: string
}

export interface AdminSnapshot {
  users: AdminUserSummary[]
  workouts: Array<{
    id: string
    userId: string
    title: string
    focus: string
    completedAt: string
    durationSeconds: number
    exercisesCompleted: number
    totalExercises: number
  }>
  missions: Array<{
    id: string
    userId: string
    missionId: string
    status: string
    completedAt: string | null
  }>
  aiSessions: Array<{
    id: string
    userId: string
    exercise: string
    exerciseLabel: string
    completedAt: string
    reps: number
    averageFormScore: number | null
    verdict: string
  }>
  nutritionDays: number
  tickets: import('./support').SupportTicket[]
  messages: import('./support').SupportMessage[]
  errors: string[]
}

export const ADMIN_ROLES: Array<{ value: AdminRole; label: string; description: string }> = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform access, administrator management and platform settings.',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Users, fitness content, support tickets and analytics.',
  },
  {
    value: 'fitness_manager',
    label: 'Fitness Manager',
    description: 'Workout plans, exercise library, missions and nutrition content.',
  },
  {
    value: 'support_manager',
    label: 'Support Manager',
    description: 'Help Desk tickets, replies, assignment and support analytics.',
  },
  {
    value: 'analyst',
    label: 'Analyst',
    description: 'Read-only platform and support analytics.',
  },
]

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'manage_users',
    'manage_roles',
    'manage_content',
    'manage_support',
    'view_analytics',
    'manage_ai',
    'manage_platform',
  ],
  admin: ['manage_users', 'manage_content', 'manage_support', 'view_analytics', 'manage_ai'],
  fitness_manager: ['manage_content', 'view_analytics'],
  support_manager: ['manage_support', 'view_analytics'],
  analyst: ['view_analytics'],
}
