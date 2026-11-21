import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Megaphone, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { Button } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import {
  broadcastNotification,
  getAdminNotifications,
  logAdminActivity,
} from '../../services/cloud/adminRepository'
import type { AppNotification } from '../../types/support'
import { formatDate } from '../../lib/utils'

export default function NotificationsPage() {
  const { admin } = useAdminAccess()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setNotifications(await getAdminNotifications())
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!admin || sending) return
    if (title.trim().length < 3 || message.trim().length < 5) {
      toast.error('Add a title and message.')
      return
    }
    setSending(true)
    try {
      const count = await broadcastNotification({ title, message, type: 'system' })
      await logAdminActivity({
        adminId: admin.uid,
        adminName: admin.name,
        action: 'notification.broadcast',
        targetType: 'platform',
        targetId: 'all_users',
        detail: `${count} recipients · ${title.trim()}`,
      })
      setSent(count)
      setTitle('')
      setMessage('')
      await load()
      toast.success(`Notification sent to ${count} member${count === 1 ? '' : 's'}.`)
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <AdminLoading label="Loading notifications…" />
  if (error) return <AdminError message={error} />

  const unread = notifications.filter((item) => !item.read).length

  return (
    <div>
      <AdminPageHeader
        eyebrow="Platform"
        title="Notifications"
        subtitle="Send an in-app platform announcement to every registered member. Delivery is written to Firestore."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminStat icon={Bell} label="Recent notifications" value={notifications.length} accent />
        <AdminStat icon={Users} label="Recipients last send" value={sent ?? '—'} note={sent === null ? 'No broadcast sent this session' : 'member documents written'} />
        <AdminStat icon={CheckCheck} label="Unread in recent sample" value={unread} note="across latest 100 records" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel eyebrow="Broadcast" title="New platform announcement">
          <form onSubmit={send} className="space-y-3">
            <label className="block">
              <span className="field-label">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="field-input !py-2.5 !text-[13px]" placeholder="Platform update" />
            </label>
            <label className="block">
              <span className="field-label">Message</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={5} className="field-textarea !text-[13px]" placeholder="What should members know?" />
              <span className="mt-1 block text-right text-[9px] text-charcoal/30">{message.length}/500</span>
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[9px] leading-relaxed text-amber-800">
              This writes a notification document for every member. It does not send email or push notifications.
            </div>
            <Button type="submit" size="sm" disabled={sending} className="w-full">
              <Send className="h-3.5 w-3.5" /> {sending ? 'Sending…' : 'Send to all members'}
            </Button>
          </form>
        </AdminPanel>

        <AdminPanel eyebrow="Delivery log" title="Recent notifications" bodyClassName="p-0">
          {notifications.length ? (
            <ul className="max-h-[520px] divide-y divide-charcoal/5 overflow-y-auto">
              {notifications.slice(0, 30).map((notification) => (
                <li key={notification.id} className="flex gap-3 px-5 py-3.5">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-charcoal/15' : 'bg-orange-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-charcoal">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-charcoal/45">{notification.message}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-charcoal/30">
                      {notification.userId.slice(0, 10)} · {notification.type} · {formatDate(new Date(notification.createdAt))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmptyState icon={Megaphone} title="No notifications sent" description="Platform broadcasts and support replies will appear here." />
          )}
        </AdminPanel>
      </div>
    </div>
  )
}
