import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { Avatar } from '../../components/ui/Avatar'
import { useProfileStore, useProfileStats } from '../../store/useProfileStore'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/cloud/adminRepository'
import type { AppNotification } from '../../types/support'
import { cn, firstName, formatDate } from '../../lib/utils'
import { relativeTime } from '../../utils/activity'
import { greetingForHour } from '../../utils/missions'

export function DashboardTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, signOut } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const avatarUrl = useProfileStore((s) => s.avatarUrl)
  const { completedMissions } = useProfileStats()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      return
    }
    listNotifications(user.uid)
      .then(setNotifications)
      .catch(() => setNotifications([]))
  }, [user?.uid])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const name = profile?.name ?? user?.displayName ?? 'Athlete'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/10 bg-ivory/95 backdrop-blur-md">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-charcoal/15 text-charcoal lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-charcoal sm:text-sm">
            {greetingForHour()}, {firstName(name)}.
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-charcoal/40">
            <span className="sm:hidden">
              {formatDate(new Date(), { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="hidden sm:inline">{formatDate(new Date())}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/dashboard/missions"
            className="mr-1 hidden items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700 transition-colors hover:bg-orange-500/10 md:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5" /> {completedMissions}/7 missions
          </Link>

          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((value) => !value)
                setProfileOpen(false)
              }}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={notificationsOpen}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/12 bg-white text-charcoal/60 transition-colors hover:text-charcoal"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-lift">
                <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal">
                    Notifications
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) return
                      void markAllNotificationsRead(user.uid).then(() =>
                        setNotifications((items) => items.map((item) => ({ ...item, read: true }))),
                      )
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-charcoal/40 hover:text-orange-600"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark read
                  </button>
                </div>
                <ul className="max-h-[320px] divide-y divide-charcoal/5 overflow-y-auto">
                  {notifications.length === 0 && (
                    <li className="px-4 py-8 text-center text-[10px] leading-relaxed text-charcoal/35">
                      No notifications yet. Support replies and platform updates will appear here.
                    </li>
                  )}
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!notification.read) {
                            void markNotificationRead(notification.id)
                            setNotifications((items) =>
                              items.map((item) =>
                                item.id === notification.id ? { ...item, read: true } : item,
                              ),
                            )
                          }
                          if (notification.relatedTicketId) {
                            setNotificationsOpen(false)
                            navigate(`/dashboard/help-desk/${notification.relatedTicketId}`)
                          }
                        }}
                        className="flex w-full gap-3 px-4 py-3.5 text-left hover:bg-ivory/60"
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                            notification.read ? 'bg-charcoal/15' : 'bg-orange-500',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-charcoal">{notification.title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-charcoal/50">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-charcoal/30">
                            {relativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-charcoal/10 bg-ivory/60 px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                  Support & platform notifications
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setProfileOpen((value) => !value)
                setNotificationsOpen(false)
              }}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
              className="flex min-h-[44px] items-center gap-2 rounded-full border border-charcoal/12 bg-white py-1 pl-1 pr-1.5 transition-colors hover:border-charcoal/25 sm:pr-2.5"
            >
              <Avatar src={avatarUrl ?? user?.photoURL} name={name} className="h-8 w-8 text-[10px]" />
              <span className="hidden max-w-[100px] truncate text-[11px] font-semibold text-charcoal sm:block">
                {firstName(name)}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-charcoal/35 sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-lift">
                <div className="border-b border-charcoal/10 px-4 py-3.5">
                  <p className="truncate text-[13px] font-semibold text-charcoal">{name}</p>
                  <p className="truncate text-[11px] text-charcoal/45">{user?.email}</p>
                  {user?.isDemo && (
                    <span className="mt-2 inline-flex rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-orange-700">
                      Demo workspace
                    </span>
                  )}
                </div>
                <div className="p-1.5">
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-[42px] items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-charcoal/70 hover:bg-ivory hover:text-charcoal"
                  >
                    <Settings className="h-4 w-4 text-charcoal/40" /> Settings
                  </Link>
                  <Link
                    to="/dashboard/missions"
                    onClick={() => setProfileOpen(false)}
                    className="flex min-h-[42px] items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-charcoal/70 hover:bg-ivory hover:text-charcoal"
                  >
                    <UserRound className="h-4 w-4 text-charcoal/40" /> My missions
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
