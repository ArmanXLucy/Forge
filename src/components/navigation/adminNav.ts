import type { ComponentType } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  Dumbbell,
  FileBarChart,
  HelpCircle,
  Images,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Salad,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  Watch,
} from 'lucide-react'
import type { AdminPermission } from '../../types/admin'

export interface AdminNavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  permission?: AdminPermission
}

export interface AdminNavGroup {
  label: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Overview', to: '/admin/overview', icon: LayoutDashboard }],
  },
  {
    label: 'User management',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'manage_users' },
      { label: 'Admins & Roles', to: '/admin/roles', icon: ShieldCheck, permission: 'manage_roles' },
    ],
  },
  {
    label: 'Fitness management',
    items: [
      { label: 'Workout Plans', to: '/admin/workouts', icon: Dumbbell, permission: 'manage_content' },
      { label: 'Exercise Library', to: '/admin/exercises', icon: ListChecks, permission: 'manage_content' },
      { label: 'Missions', to: '/admin/missions', icon: Target, permission: 'manage_content' },
      { label: 'Nutrition', to: '/admin/nutrition', icon: Salad, permission: 'manage_content' },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Help Desk', to: '/admin/help-desk', icon: HelpCircle, permission: 'manage_support' },
      { label: 'Support Analytics', to: '/admin/support-analytics', icon: FileBarChart, permission: 'manage_support' },
    ],
  },
  {
    label: 'AI management',
    items: [
      { label: 'Model Monitoring', to: '/admin/ai-monitoring', icon: BrainCircuit, permission: 'manage_ai' },
      { label: 'AI Coach Monitoring', to: '/admin/ai-coach-monitoring', icon: Watch, permission: 'manage_ai' },
      { label: 'AI Error Log', to: '/admin/ai-errors', icon: AlertTriangle, permission: 'manage_ai' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Analytics & Reports', to: '/admin/analytics', icon: BarChart3, permission: 'view_analytics' },
      { label: 'Media Management', to: '/admin/media', icon: Images, permission: 'manage_platform' },
      { label: 'Notifications', to: '/admin/notifications', icon: Bell, permission: 'manage_platform' },
      { label: 'Announcements', to: '/admin/announcements', icon: Megaphone, permission: 'manage_platform' },
      { label: 'Activity Log', to: '/admin/activity', icon: ScrollText, permission: 'view_analytics' },
      { label: 'Settings', to: '/admin/settings', icon: Settings, permission: 'manage_platform' },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Admin Profile', to: '/admin/profile', icon: UserRound }],
  },
]

export const adminQuickStats = [
  { label: 'Platform health', icon: Activity },
]
