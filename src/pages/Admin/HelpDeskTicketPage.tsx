import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  LockKeyhole,
  MessageSquare,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminError,
  AdminLoading,
  AdminPanel,
  SupportPriorityBadge,
  SupportStatusBadge,
} from '../../components/admin/ui'
import { buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import {
  addInternalNote,
  addTicketMessage,
  getAdminUserDetail,
  getInternalNotes,
  getTicket,
  getTicketMessages,
  listAdminUsers,
  updateTicket,
} from '../../services/cloud/adminRepository'
import type { AdminUser, AdminUserDetail } from '../../types/admin'
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportCategoryLabel,
  type SupportInternalNote,
  type SupportMessage,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../types/support'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function AdminTicketPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const { admin } = useAdminAccess()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [notes, setNotes] = useState<SupportInternalNote[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!ticketId) return
    setLoading(true)
    try {
      const nextTicket = await getTicket(ticketId)
      if (!nextTicket) {
        setError('Ticket not found.')
        return
      }
      const [nextMessages, nextNotes, adminList, detail] = await Promise.all([
        getTicketMessages(ticketId),
        getInternalNotes(ticketId),
        listAdminUsers(),
        getAdminUserDetail(nextTicket.userId).catch(() => null),
      ])
      setTicket(nextTicket)
      setMessages(nextMessages)
      setNotes(nextNotes)
      setAdmins(adminList.filter((item) => item.active))
      setUserDetail(detail)
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [ticketId])

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ticket || !admin || sending || reply.trim().length < 2) return
    setSending(true)
    try {
      await addTicketMessage({
        ticket,
        senderId: admin.uid,
        senderName: admin.name,
        senderRole: 'admin',
        message: reply,
        admin,
      })
      setReply('')
      await load()
      toast.success('Reply sent to member.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSending(false)
    }
  }

  const changeField = async (
    values: { status?: SupportStatus; priority?: SupportPriority; assignedAdminId?: string; assignedAdminName?: string },
    label: string,
  ) => {
    if (!ticket || !admin) return
    setSaving(true)
    try {
      await updateTicket(ticket.id, values, admin)
      await load()
      toast.success(`${label} updated.`)
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const assign = async (uid: string) => {
    const selected = admins.find((item) => item.uid === uid)
    await changeField(
      { assignedAdminId: selected?.uid ?? '', assignedAdminName: selected?.name ?? '' },
      'Assignment',
    )
  }

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ticket || !admin || note.trim().length < 2 || saving) return
    setSaving(true)
    try {
      await addInternalNote({ ticketId: ticket.id, admin, note })
      setNote('')
      await load()
      toast.success('Internal note saved.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const firstResponse = useMemo(() => {
    if (!ticket) return null
    const firstAdmin = messages.find((message) => message.senderRole === 'admin')
    if (!firstAdmin) return null
    const minutes = Math.max(
      0,
      Math.round((new Date(firstAdmin.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000),
    )
    return minutes
  }, [messages, ticket])

  if (loading) {
    return <div className="rounded-2xl border border-charcoal/10 bg-white"><AdminLoading label="Opening ticket…" /></div>
  }
  if (error || !ticket) {
    return (
      <div>
        <Link to="/admin/help-desk" className="mb-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40 hover:text-charcoal">
          <ArrowLeft className="h-3.5 w-3.5" /> Help Desk
        </Link>
        <div className="rounded-2xl border border-charcoal/10 bg-white p-5"><AdminError message={error ?? 'Ticket not found.'} /></div>
      </div>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => navigate('/admin/help-desk')} className="mb-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40 hover:text-charcoal">
        <ArrowLeft className="h-3.5 w-3.5" /> Help Desk queue
      </button>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-600">{ticket.ticketId}</span>
            <SupportStatusBadge status={ticket.status} />
            <SupportPriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="mt-2 font-display text-3xl uppercase leading-none text-charcoal sm:text-4xl">{ticket.subject}</h1>
          <p className="mt-2 text-[10px] text-charcoal/40">
            {supportCategoryLabel(ticket.category)} · {ticket.userName} · {formatDate(new Date(ticket.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={ticket.status}
            disabled={saving}
            onChange={(event) => void changeField({ status: event.target.value as SupportStatus }, 'Status')}
            aria-label="Ticket status"
            className="rounded-xl border border-charcoal/12 bg-white px-3 py-2 text-[10px] font-semibold text-charcoal/65 focus:border-orange-500 focus:outline-none"
          >
            {SUPPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select
            value={ticket.priority}
            disabled={saving}
            onChange={(event) => void changeField({ priority: event.target.value as SupportPriority }, 'Priority')}
            aria-label="Ticket priority"
            className="rounded-xl border border-charcoal/12 bg-white px-3 py-2 text-[10px] font-semibold text-charcoal/65 focus:border-orange-500 focus:outline-none"
          >
            {SUPPORT_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/40">Conversation</p>
              <p className="text-[9px] text-charcoal/35">{messages.length} message{messages.length === 1 ? '' : 's'}</p>
            </div>
            <div className="space-y-4 bg-ivory/30 px-5 py-5">
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-charcoal/10 bg-white px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Member · original request</p>
                  <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-charcoal/70">{ticket.description}</p>
                  <p className="mt-2 text-[9px] text-charcoal/30">{formatDate(new Date(ticket.createdAt))}</p>
                </div>
              </div>
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.senderRole === 'admin' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%] rounded-2xl px-4 py-3', message.senderRole === 'admin' ? 'rounded-br-md bg-charcoal text-white' : 'rounded-bl-md border border-charcoal/10 bg-white text-charcoal')}>
                    <p className={cn('text-[9px] font-bold uppercase tracking-[0.12em]', message.senderRole === 'admin' ? 'text-orange-400' : 'text-charcoal/35')}>
                      {message.senderRole === 'admin' ? message.senderName || 'Support' : message.senderName || 'Member'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed">{message.message}</p>
                    <p className={cn('mt-2 text-[9px]', message.senderRole === 'admin' ? 'text-white/30' : 'text-charcoal/30')}>{formatDate(new Date(message.createdAt))}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-center text-[10px] text-charcoal/35">No replies yet.</p>}
            </div>
            <form onSubmit={sendReply} className="border-t border-charcoal/8 p-4">
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder="Reply to the member…" className="field-textarea !min-h-[92px] !text-[13px]" disabled={sending} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[9px] text-charcoal/35">Replies are visible to the member and create an in-app notification.</p>
                <button type="submit" disabled={sending || reply.trim().length < 2} className={buttonClasses('primary', 'sm')}>
                  <Send className="h-3.5 w-3.5" /> {sending ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </form>
          </div>

          <AdminPanel eyebrow="Private" title="Internal notes" action={<span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-charcoal/30"><LockKeyhole className="h-3 w-3" /> Admin only</span>}>
            <form onSubmit={addNote} className="space-y-2">
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add context for the support team. Members cannot see this." className="field-textarea !min-h-[80px] !text-[12px]" disabled={saving} />
              <div className="flex justify-end">
                <button type="submit" disabled={saving || note.trim().length < 2} className={buttonClasses('dark', 'sm')}>Add internal note</button>
              </div>
            </form>
            {notes.length > 0 && (
              <ul className="mt-4 space-y-2">
                {notes.map((item) => (
                  <li key={item.id} className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3">
                    <p className="text-[10px] font-semibold text-charcoal/70">{item.adminName}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-charcoal/60">{item.note}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-charcoal/30">{formatDate(new Date(item.createdAt))}</p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>

        <aside className="space-y-4">
          <AdminPanel eyebrow="Member" title={ticket.userName} action={<Link to="/admin/users" className="text-[9px] font-bold uppercase tracking-[0.1em] text-orange-600">Profile</Link>}>
            <p className="text-[10px] text-charcoal/45">{ticket.userEmail}</p>
            <p className="mt-1 break-all text-[9px] text-charcoal/30">UID {ticket.userId}</p>
            {userDetail ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ['Workouts', userDetail.workouts.length],
                  ['Missions', userDetail.missions.length],
                  ['AI sessions', userDetail.aiSessions],
                  ['Tickets', userDetail.tickets],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-ivory p-2.5">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/35">{label}</p>
                    <p className="mt-1 text-[13px] font-semibold text-charcoal">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[9px] text-charcoal/35">Member activity is unavailable.</p>
            )}
            <div className="mt-3 space-y-1.5 text-[9px] text-charcoal/40">
              <p>Account status: <span className="font-semibold text-charcoal/65">{userDetail?.user.accountStatus ?? 'Unknown'}</span></p>
              <p>Profile: <span className="font-semibold text-charcoal/65">{userDetail?.user.profileCompletedAt ? 'Complete' : 'Incomplete'}</span></p>
              <p>Registered: <span className="font-semibold text-charcoal/65">{userDetail ? formatDate(new Date(userDetail.user.createdAt)) : '—'}</span></p>
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Routing" title="Assignment">
            <label className="block">
              <span className="field-label">Assigned administrator</span>
              <select
                value={ticket.assignedAdminId}
                disabled={saving}
                onChange={(event) => void assign(event.target.value)}
                className="field-input !py-2.5 !text-[11px]"
              >
                <option value="">Unassigned</option>
                {admins.map((item) => <option key={item.uid} value={item.uid}>{item.name}</option>)}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={saving || ticket.status === 'resolved'} onClick={() => void changeField({ status: 'resolved' }, 'Status')} className={buttonClasses('primary', 'sm')}>
                Resolve ticket
              </button>
              <button type="button" disabled={saving || ticket.status === 'closed'} onClick={() => void changeField({ status: 'closed' }, 'Status')} className={buttonClasses('outline', 'sm')}>
                Close
              </button>
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Metadata" title="Ticket record">
            <dl className="space-y-2.5 text-[10px]">
              {[
                ['Ticket ID', ticket.ticketId],
                ['Category', supportCategoryLabel(ticket.category)],
                ['Created', formatDate(new Date(ticket.createdAt))],
                ['Last update', formatDate(new Date(ticket.lastMessageAt))],
                ['Resolved', ticket.resolvedAt ? formatDate(new Date(ticket.resolvedAt)) : 'Not resolved'],
                ['Messages', String(ticket.messageCount)],
                ['First response', firstResponse === null ? 'No admin reply' : `${firstResponse} min`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="text-charcoal/40">{label}</dt>
                  <dd className="text-right font-medium text-charcoal/65">{value}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>

          <div className="flex items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-[9px] leading-relaxed text-charcoal/40">
            <ShieldCheck className="h-4 w-4 shrink-0 text-orange-500" />
            Member replies set the ticket to open. Admin replies set it to waiting for user.
          </div>
          <Link to="/admin/help-desk" className="flex items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/45 hover:text-charcoal">
            <MessageSquare className="h-3.5 w-3.5" /> Back to queue
          </Link>
        </aside>
      </div>
    </div>
  )
}
