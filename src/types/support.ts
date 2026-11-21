export type SupportCategory =
  | 'account'
  | 'workouts'
  | 'ai-coach'
  | 'nutrition'
  | 'progress'
  | 'technical'
  | 'other'

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent'

export type SupportStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'resolved'
  | 'closed'

export type SupportSenderRole = 'user' | 'admin'

export interface SupportTicket {
  id: string
  ticketId: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  category: SupportCategory
  description: string
  priority: SupportPriority
  status: SupportStatus
  assignedAdminId: string
  assignedAdminName: string
  messageCount: number
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  resolvedAt: string | null
}

export interface SupportMessage {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  senderRole: SupportSenderRole
  message: string
  createdAt: string
}

export interface SupportInternalNote {
  id: string
  ticketId: string
  adminId: string
  adminName: string
  note: string
  createdAt: string
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  message: string
  type: 'support' | 'system' | 'workout' | 'mission'
  relatedTicketId: string | null
  read: boolean
  createdAt: string
}

export const SUPPORT_CATEGORIES: Array<{ value: SupportCategory; label: string }> = [
  { value: 'account', label: 'Account & Login' },
  { value: 'workouts', label: 'Workout Plans' },
  { value: 'ai-coach', label: 'AI Coach' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'progress', label: 'Progress Tracking' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'other', label: 'Other' },
]

export const SUPPORT_PRIORITIES: Array<{ value: SupportPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const SUPPORT_STATUSES: Array<{ value: SupportStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export function supportCategoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((item) => item.value === category)?.label ?? 'Other'
}

export function supportStatusLabel(status: SupportStatus): string {
  return SUPPORT_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function supportPriorityLabel(priority: SupportPriority): string {
  return SUPPORT_PRIORITIES.find((item) => item.value === priority)?.label ?? priority
}
